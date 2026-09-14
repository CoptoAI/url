import { z } from 'zod'
import { SlugSchema } from '#shared/schemas/link'
import { requireApiKeyPermission } from '../../saas/api-keys/service'

defineRouteMeta({
  openAPI: {
    description: 'Delete a short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['slug'],
            properties: {
              slug: { type: 'string', description: 'The slug of the link to delete' },
            },
          },
        },
      },
    },
  },
})

const DeleteSchema = z.object({
  slug: SlugSchema.min(1),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, DeleteSchema.parse)
  requireApiKeyPermission(event, 'links:write')
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot delete links.',
    })
  }

  const slug = normalizeSlug(event, body.slug)

  const existingLink = await getAnyAuthoritativeLink(event, slug)
  if (!existingLink) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  const linkObj = existingLink as Record<string, unknown>
  const callerOrgId = event.context.organizationId
  const linkOrgId = linkObj.organizationId as string | undefined

  if (event.context.authMethod === 'session-jwt' || event.context.authMethod === 'api-key') {
    if (!callerOrgId || linkOrgId !== callerOrgId) {
      throw createError({
        status: 403,
        statusText: 'Forbidden: Link belongs to another organization',
      })
    }
  }

  const orgId = linkOrgId || callerOrgId

  await deleteLink(event, slug)

  if (orgId) {
    try {
      const { recordAuditLog } = await import('../../saas/audit')
      const { dispatchWebhookEvent } = await import('../../saas/webhooks')
      await recordAuditLog(event, {
        organizationId: orgId,
        action: 'link.deleted',
        resourceType: 'link',
        resourceId: slug,
        details: { slug },
      })
      await dispatchWebhookEvent(event, {
        organizationId: orgId,
        eventName: 'link.deleted',
        payload: { slug },
      })
    }
    catch (err) {
      console.error('DELETE WEBHOOK ERROR:', err)
    }
  }
})
