import type { Link } from '#shared/schemas/link'
import { EditLinkSchema } from '#shared/schemas/link'
import { requireApiKeyPermission } from '../../saas/api-keys/service'

defineRouteMeta({
  openAPI: {
    description: 'Edit an existing short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url', 'slug'],
            properties: {
              url: { type: 'string', description: 'The target URL' },
              slug: { type: 'string', description: 'The slug of the link to edit' },
              comment: { type: 'string', description: 'Optional comment' },
              expiration: { type: 'integer', description: 'Expiration timestamp (unix seconds)' },
              title: { type: 'string', description: 'Custom title for link preview' },
              description: { type: 'string', description: 'Custom description for link preview' },
              image: { type: 'string', description: 'Custom image for link preview' },
              apple: { type: 'string', description: 'Apple App Store redirect URL' },
              google: { type: 'string', description: 'Google Play Store redirect URL' },
              cloaking: { type: 'boolean', description: 'Enable link cloaking (mask destination URL)' },
              redirectWithQuery: { type: 'boolean', description: 'Append query parameters to destination URL' },
              password: { type: 'string', description: 'Password protection for the link' },
              unsafe: { type: 'boolean', description: 'Mark link as unsafe, showing a warning page before redirect' },
              geo: { type: 'object', additionalProperties: { type: 'string' }, description: 'Geo-routing rules (country code to URL)' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Up to 10 normalized link tags, each 1-32 characters' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, EditLinkSchema.parse)
  requireApiKeyPermission(event, 'links:write')
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot edit links.',
    })
  }
  link.slug = normalizeSlug(event, link.slug)

  if (link.customDomainId) {
    const { customDomains } = await import('../../database/schema')
    const { getD1Database } = await import('../../services/link-store/d1')
    const { and, eq } = await import('drizzle-orm')
    const db = getD1Database(event)
    const [domain] = await db.select().from(customDomains).where(
      event.context.organizationId
        ? and(eq(customDomains.id, link.customDomainId), eq(customDomains.organizationId, event.context.organizationId))
        : eq(customDomains.id, link.customDomainId),
    )
    if (!domain || domain.status !== 'active') {
      throw createError({
        status: 400,
        statusText: 'Custom domain is invalid or not active',
      })
    }
    link.customDomain = domain.domain
  }
  else if (link.customDomain) {
    const { systemShortDomains, defaultShortDomain } = useRuntimeConfig(event)
    const allowed = (
      Array.isArray(systemShortDomains)
        ? systemShortDomains
        : ((systemShortDomains as string) || (defaultShortDomain as string) || 'shaf.is').split(',')
    ).map((d: string) => d.trim().toLowerCase()).filter(Boolean)
    if (!allowed.includes(link.customDomain.toLowerCase())) {
      throw createError({
        status: 400,
        statusText: `Domain ${link.customDomain} is not a valid short domain`,
      })
    }
  }

  const existingLink: Link | null = await getAnyAuthoritativeLink(event, link.slug)
  if (!existingLink) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  if (link.url !== existingLink.url)
    await detectUnsafeLink(event, link)

  const newLink = mergeEditableLink(existingLink, link)
  await applyEditableLinkPassword(newLink, link.password)

  if (!await updateLink(event, newLink, { id: existingLink.id, updatedAt: existingLink.updatedAt })) {
    throw createError({
      status: 409,
      statusText: 'Link was modified or replaced',
    })
  }

  const linkObj = newLink as Record<string, unknown>
  const ctx = event.context as Record<string, unknown>
  const orgId = (linkObj.organizationId as string | undefined) || (ctx.organizationId as string | undefined)
  if (orgId) {
    try {
      const { recordAuditLog } = await import('../../saas/audit')
      const { dispatchWebhookEvent } = await import('../../saas/webhooks')
      await recordAuditLog(event, {
        organizationId: orgId,
        action: 'link.updated',
        resourceType: 'link',
        resourceId: newLink.slug,
        details: { url: newLink.url, title: newLink.title },
      })
      await dispatchWebhookEvent(event, {
        organizationId: orgId,
        eventName: 'link.updated',
        payload: { slug: newLink.slug, url: newLink.url, title: newLink.title, comment: newLink.comment },
      })
    }
    catch (err) {
      console.error('EDIT WEBHOOK ERROR:', err)
    }
  }

  setResponseStatus(event, 201)
  return buildLinkResponse(event, newLink)
})
