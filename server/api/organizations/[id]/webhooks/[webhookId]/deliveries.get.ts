import { and, desc, eq } from 'drizzle-orm'
import { webhookDeliveries, webhooks } from '../../../../../database/schema'
import { requireOrganizationMember } from '../../../../../saas/organizations/service'
import { getD1Database } from '../../../../../services/link-store/d1'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const webhookId = getRouterParam(event, 'webhookId')
  const userId = event.context.userID

  if (!orgId || !webhookId) {
    throw createError({ status: 400, statusText: 'Organization ID and Webhook ID are required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin', 'member'])
  }

  const db = getD1Database(event)

  const [webhook] = await db.select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  if (!webhook) {
    throw createError({ status: 404, statusText: 'Webhook not found' })
  }

  const deliveries = await db.select()
    .from(webhookDeliveries)
    .where(and(
      eq(webhookDeliveries.webhookId, webhookId),
      eq(webhookDeliveries.organizationId, orgId),
    ))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(30)

  return {
    deliveries,
  }
})
