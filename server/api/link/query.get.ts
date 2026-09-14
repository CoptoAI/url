import { z } from 'zod'

import { requireApiKeyPermission } from '../../saas/api-keys/service'

defineRouteMeta({
  openAPI: {
    description: 'Query a short link by slug',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'slug',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        description: 'The slug of the link to query',
      },
    ],
  },
})

const QueryParamsSchema = z.object({
  slug: z.string().trim().min(1).max(2048),
})

export default eventHandler(async (event) => {
  requireApiKeyPermission(event, 'links:read')
  const query = await getValidatedQuery(event, QueryParamsSchema.parse)
  const slug = normalizeSlug(event, query.slug)

  const { link, metadata } = await getLinkWithMetadata(event, slug)
  if (link) {
    const linkObj = link as Record<string, unknown>
    const callerOrgId = event.context.organizationId
    const linkOrgId = linkObj.organizationId as string | undefined

    if (event.context.authMethod === 'session-jwt' || event.context.authMethod === 'api-key') {
      if (!callerOrgId || linkOrgId !== callerOrgId) {
        throw createError({
          status: 404,
          statusText: 'Not Found',
        })
      }
    }

    return sanitizeLinkPassword({
      ...metadata,
      ...link,
    })
  }

  throw createError({
    status: 404,
    statusText: 'Not Found',
  })
})
