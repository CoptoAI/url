import type { Link } from '@/types'
import { parsePath, withQuery } from 'ufo'
import { lookupDomainConfig } from '../saas/domains/service'

const SOCIAL_BOTS = [
  'applebot',
  'discordbot',
  'facebot',
  'facebookexternalhit',
  'linkedinbot',
  'linkexpanding',
  'mastodon',
  'skypeuripreview',
  'slackbot',
  'slackbot-linkexpanding',
  'snapchat',
  'telegrambot',
  'tiktok',
  'twitterbot',
  'whatsapp',
]

const APPLE_DEVICE_UA_MARKERS = ['iphone', 'ipad', 'ipod', 'crios']

function isSocialBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return SOCIAL_BOTS.some(bot => ua.includes(bot))
}

function getDeviceRedirectUrl(userAgent: string, link: Link): string | null {
  if (!link.apple && !link.google)
    return null

  const ua = userAgent.toLowerCase()

  if (link.google && ua.includes('android')) {
    return link.google
  }

  if (link.apple && APPLE_DEVICE_UA_MARKERS.some(marker => ua.includes(marker))) {
    return link.apple
  }

  return null
}

function hasOgConfig(link: Link): boolean {
  return !!(link.title || link.image)
}

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, ''))
  const { slugRegex, reserveSlug } = useAppConfig()
  const {
    homeURL,
    linkCacheTtl,
    caseSensitive,
    redirectWithQuery,
    redirectStatusCode,
    redirectNoStore,
    mainDomain,
    dashboardDomain,
    defaultShortDomain,
    systemShortDomains,
  } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  const requestHost = getRequestHost(event, { xForwardedHost: true }).split(':')[0]!.toLowerCase()
  const normalizedMainDomain = ((mainDomain as string) || 'shaf.app').toLowerCase()
  const normalizedDashboardDomain = ((dashboardDomain as string) || 'dash.shaf.app').toLowerCase()
  const normalizedDefaultShortDomain = ((defaultShortDomain as string) || 'shaf.is').toLowerCase()
  const normalizedSystemShortDomains = (
    Array.isArray(systemShortDomains)
      ? systemShortDomains
      : ((systemShortDomains as string) || normalizedDefaultShortDomain || 'shaf.is').split(',')
  ).map((d: string) => d.trim().toLowerCase()).filter(Boolean)

  const isSystemShortDomain = normalizedSystemShortDomains.includes(requestHost)
  const isDashboardHost = normalizedDashboardDomain && requestHost === normalizedDashboardDomain
  const isMarketingHost = requestHost === normalizedMainDomain || requestHost === `www.${normalizedMainDomain}`

  // 1. App dashboard subdomain routing (e.g. dash.shaf.app)
  if (isDashboardHost) {
    if (event.path === '/') {
      return sendRedirect(event, '/dashboard', 302)
    }
  }

  // 2. Main marketing domain routing (e.g. shaf.app or www.shaf.app)
  if (isMarketingHost && normalizedDashboardDomain && normalizedDashboardDomain !== requestHost) {
    if (
      event.path.startsWith('/dashboard')
      || event.path.startsWith('/auth')
      || event.path === '/onboarding'
    ) {
      return sendRedirect(event, `https://${normalizedDashboardDomain}${event.path}`, 302)
    }
  }

  let customDomainConfig: Awaited<ReturnType<typeof lookupDomainConfig>> = null
  if (cloudflare) {
    try {
      customDomainConfig = await lookupDomainConfig(event, requestHost)
    }
    catch {
      // Non-blocking fallback
    }
  }

  if (event.path === '/') {
    // 3. System short domains (e.g. shaf.is) redirect root to main marketing domain
    if (isSystemShortDomain) {
      return sendRedirect(event, `https://${normalizedMainDomain}`, 302)
    }
    if (customDomainConfig?.rootRedirectUrl) {
      return sendRedirect(event, customDomainConfig.rootRedirectUrl)
    }
    if (customDomainConfig && !customDomainConfig.rootRedirectUrl) {
      return sendRedirect(event, `https://${normalizedMainDomain}`, 302)
    }
    if (homeURL) {
      return sendRedirect(event, homeURL)
    }
  }

  const { notFoundRedirect } = useRuntimeConfig(event)
  // Bypass redirect check for notFoundRedirect path to prevent infinite loop
  if (notFoundRedirect && event.path === notFoundRedirect) {
    return
  }

  if (slug && !reserveSlug.includes(slug.toLowerCase()) && slugRegex.test(slug) && cloudflare) {
    let link: Link | null = null

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(event, caseSensitive ? slug : lowerCaseSlug, linkCacheTtl)

    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(event, slug, linkCacheTtl)
    }

    // Domain scoping rules:
    // A. If request arrived via a tenant custom domain, ensure link matches that domain
    if (link && customDomainConfig) {
      if (link.customDomainId && link.customDomainId !== customDomainConfig.domainId) {
        link = null
      }
      if (link && link.customDomain && link.customDomain.toLowerCase() !== requestHost) {
        link = null
      }
    }
    // B. If request arrived via a system short domain (e.g. shaf.is)
    else if (link && isSystemShortDomain) {
      if (link.customDomainId) {
        // Link belongs to a tenant custom domain, do not resolve on system domain
        link = null
      }
      else if (link.customDomain && link.customDomain.toLowerCase() !== requestHost) {
        // Link was created specifically for another system domain
        link = null
      }
    }
    // C. If request arrived via marketing or dashboard domain, ensure we only resolve default links
    else if (link && (isMarketingHost || isDashboardHost)) {
      if (link.customDomainId || (link.customDomain && link.customDomain.toLowerCase() !== normalizedDefaultShortDomain)) {
        link = null
      }
    }

    if (link) {
      let locale: RedirectLocale | undefined
      const getLocale = () => {
        locale ??= resolveRedirectLocale(event)
        return locale
      }
      const sendNoStoreHtml = (html: string) => {
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-store')
        return html
      }
      const userAgent = getHeader(event, 'user-agent') || ''
      const query = getQuery(event)
      const shouldRedirectWithQuery = link.redirectWithQuery ?? redirectWithQuery
      const buildTarget = (url: string) => shouldRedirectWithQuery ? withQuery(url, query) : url

      let targetUrl = link.url
      const country = event.context.cloudflare?.request?.cf?.country
      if (country && typeof country === 'string' && link.geo?.[country.toUpperCase()]) {
        targetUrl = link.geo[country.toUpperCase()]!
      }
      targetUrl = buildTarget(targetUrl)

      const deviceRedirectUrl = getDeviceRedirectUrl(userAgent, link)
      const finalTargetUrl = deviceRedirectUrl ?? targetUrl

      // Password protection check
      if (link.password) {
        const headerPassword = getHeader(event, 'x-link-password')

        if (event.method === 'POST') {
          const body = await readBody(event)
          const submittedPassword = typeof body?.password === 'string' ? body.password : ''

          if (!await verifyLinkPassword(submittedPassword, link.password)) {
            return sendNoStoreHtml(generatePasswordHtml(slug, { hasError: true, locale: getLocale() }))
          }

          // Password correct - show unsafe warning if needed
          if (link.unsafe && body?.confirm !== 'true') {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { password: submittedPassword, locale: getLocale() }))
          }
        }
        else if (headerPassword) {
          if (!await verifyLinkPassword(headerPassword, link.password)) {
            throw createError({ status: 403, statusText: 'Incorrect password' })
          }
          // Header-password path: check unsafe warning via x-link-confirm header
          if (link.unsafe && getHeader(event, 'x-link-confirm') !== 'true') {
            throw createError({ status: 403, statusText: 'Unsafe link: confirmation required (set x-link-confirm: true header)' })
          }
        }
        else {
          return sendNoStoreHtml(generatePasswordHtml(slug, { locale: getLocale() }))
        }
      }

      // Unsafe link warning (for links without password)
      if (!link.password && link.unsafe) {
        if (event.method === 'POST') {
          const body = await readBody(event)
          if (body?.confirm !== 'true') {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
          }
        }
        else {
          return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
        }
      }

      event.context.link = link
      let accessLogResult: AccessLogResult | undefined
      try {
        accessLogResult = collectAccessLog(event)
      }
      catch {
        console.error({ event: 'access_log.collection.failed' })
      }

      if (accessLogResult) {
        try {
          writeAccessLog(event, accessLogResult.logs)
        }
        catch {
          console.error({ event: 'access_log.write.failed' })
        }

        try {
          queueLinkClickedWebhook(event, accessLogResult.click, link)
        }
        catch {
          console.error({ event: 'webhook.scheduling.failed' })
        }
      }

      if (deviceRedirectUrl) {
        if (redirectNoStore)
          setHeader(event, 'Cache-Control', 'no-store')
        return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
      }

      if (isSocialBot(userAgent) && hasOgConfig(link)) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateOgHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        return html
      }

      if (link.cloaking) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateCloakingHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-store, private')
        return html
      }

      if (redirectNoStore)
        setHeader(event, 'Cache-Control', 'no-store')
      return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
    }
    else {
      if (customDomainConfig?.notFoundRedirectUrl) {
        return sendRedirect(event, customDomainConfig.notFoundRedirectUrl, 302)
      }

      if (notFoundRedirect) {
        return sendRedirect(event, notFoundRedirect, 302)
      }

      throw createError({ status: 404, statusText: 'Link not found' })
    }
  }
})
