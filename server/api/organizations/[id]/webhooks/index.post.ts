import { CreateWebhookSchema } from '#shared/schemas/saas'
import { webhooks } from '../../../../database/schema'
import { recordAuditLog } from '../../../../saas/audit'
import { requireOrganizationMember } from '../../../../saas/organizations/service'
import { getD1Database } from '../../../../services/link-store/d1'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const userId = event.context.userID

  if (!orgId) {
    throw createError({ status: 400, statusText: 'Organization ID is required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  const body = await readValidatedBody(event, CreateWebhookSchema.parse)
  const db = getD1Database(event)

  const id = `wh_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`
  const now = Math.floor(Date.now() / 1000)

  await db.insert(webhooks).values({
    id,
    organizationId: orgId,
    url: body.url,
    secret,
    events: body.events,
    description: body.description,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })

  await recordAuditLog(event, {
    organizationId: orgId,
    action: 'webhook.created',
    resourceType: 'webhook',
    resourceId: id,
    details: { url: body.url, events: body.events },
  })

  return {
    webhook: {
      id,
      organizationId: orgId,
      url: body.url,
      secret,
      secretPrefix: `${secret.slice(0, 10)}...`,
      events: body.events,
      description: body.description,
      isActive: true,
      createdAt: now,
    },
  }
})
