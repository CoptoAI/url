export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const gaId = config.public.googleAnalyticsId as string | undefined
  const clarityId = config.public.microsoftClarityId as string | undefined

  // Google Analytics (gtag.js)
  if (gaId) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
    window.gtag = gtag
    gtag('js', new Date())
    gtag('config', gaId)

    // Handle SPA client-side route changes
    const router = useRouter()
    let isInitialRoute = true

    router.afterEach((to) => {
      if (isInitialRoute) {
        isInitialRoute = false
        return
      }

      nextTick(() => {
        if (window.gtag) {
          window.gtag('event', 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            page_path: to.fullPath,
          })
        }
      })
    })
  }

  // Microsoft Clarity
  if (clarityId) {
    (function (c: Window, l: Document, a: string, r: string, i: string) {
      const win = c as unknown as Record<string, unknown>
      win[a] = win[a] || function (...args: unknown[]) {
        const fn = win[a] as { q?: unknown[] }
        fn.q = fn.q || []
        fn.q.push(args)
      }
      const t = l.createElement(r) as HTMLScriptElement
      t.async = true
      t.src = `https://www.clarity.ms/tag/${encodeURIComponent(i)}`
      const y = l.getElementsByTagName(r)[0]
      if (y?.parentNode) {
        y.parentNode.insertBefore(t, y)
      }
      else {
        l.head.appendChild(t)
      }
    })(window, document, 'clarity', 'script', clarityId)
  }
})
