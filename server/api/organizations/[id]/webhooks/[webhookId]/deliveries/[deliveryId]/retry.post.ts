import { and, eq } from 'drizzle-orm'
import { webhookDeliveries, webhooks } from '../../../../../../../database/schema'
import { requireOrganizationMember } from '../../../../../../../saas/organizations/service'
import { deliverSingleWebhook } from '../../../../../../../saas/webhooks'
import { getD1Database } from '../../../../../../../services/link-store/d1'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const webhookId = getRouterParam(event, 'webhookId')
  const deliveryId = getRouterParam(event, 'deliveryId')
  const userId = event.context.userID

  if (!orgId || !webhookId || !deliveryId) {
    throw createError({ status: 400, statusText: 'Organization ID, Webhook ID, and Delivery ID are required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  const db = getD1Database(event)
  const [webhook] = await db.select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  if (!webhook) {
    throw createError({ status: 404, statusText: 'Webhook not found' })
  }

  const [delivery] = await db.select()
    .from(webhookDeliveries)
    .where(and(
      eq(webhookDeliveries.id, deliveryId),
      eq(webhookDeliveries.webhookId, webhookId),
      eq(webhookDeliveries.organizationId, orgId),
    ))

  if (!delivery) {
    throw createError({ status: 404, statusText: 'Delivery record not found' })
  }

  const payload = delivery.payload as { data?: Record<string, unknown> } | null
  const payloadData = payload?.data || {}

  const result = await deliverSingleWebhook(
    event,
    webhook,
    delivery.event,
    payloadData,
  )

  return result
})
