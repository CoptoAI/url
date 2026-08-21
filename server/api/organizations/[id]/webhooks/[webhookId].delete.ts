import { and, eq } from 'drizzle-orm'
import { webhooks } from '../../../../database/schema'
import { recordAuditLog } from '../../../../saas/audit'
import { requireOrganizationMember } from '../../../../saas/organizations/service'
import { getD1Database } from '../../../../services/link-store/d1'

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

  const [existing] = await db.select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  if (!existing) {
    throw createError({ status: 404, statusText: 'Webhook not found' })
  }

  await db.delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  await recordAuditLog(event, {
    organizationId: orgId,
    action: 'webhook.deleted',
    resourceType: 'webhook',
    resourceId: webhookId,
    details: { url: existing.url },
  })

  return { success: true }
})
