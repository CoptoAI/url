import { and, eq } from 'drizzle-orm'
import { webhooks } from '../../../../../database/schema'
import { requireOrganizationMember } from '../../../../../saas/organizations/service'
import { deliverSingleWebhook } from '../../../../../saas/webhooks'
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
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  const db = getD1Database(event)
  const [webhook] = await db.select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  if (!webhook) {
    throw createError({ status: 404, statusText: 'Webhook not found' })
  }

  const result = await deliverSingleWebhook(
    event,
    webhook,
    'ping',
    {
      message: 'This is a test webhook ping from Sink',
      organizationId: orgId,
      timestamp: Date.now(),
    },
  )

  return result
})
