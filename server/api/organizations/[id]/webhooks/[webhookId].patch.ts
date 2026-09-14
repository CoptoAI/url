import { and, eq } from 'drizzle-orm'
import { UpdateWebhookSchema } from '#shared/schemas/saas'
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

  const body = await readValidatedBody(event, UpdateWebhookSchema.parse)
  const db = getD1Database(event)

  const [existing] = await db.select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  if (!existing) {
    throw createError({ status: 404, statusText: 'Webhook not found' })
  }

  const now = Math.floor(Date.now() / 1000)
  const updates: Partial<typeof webhooks.$inferInsert> = {
    updatedAt: now,
  }

  if (body.url !== undefined) {
    const { isSafeWebhookUrl } = await import('../../../../saas/webhooks')
    if (!isSafeWebhookUrl(body.url)) {
      throw createError({
        status: 400,
        statusText: 'Webhook URL targets disallowed internal or private address',
      })
    }
    updates.url = body.url
  }
  if (body.events !== undefined)
    updates.events = body.events
  if (body.description !== undefined)
    updates.description = body.description
  if (body.isActive !== undefined)
    updates.isActive = body.isActive

  await db.update(webhooks)
    .set(updates)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)))

  await recordAuditLog(event, {
    organizationId: orgId,
    action: 'webhook.updated',
    resourceType: 'webhook',
    resourceId: webhookId,
    details: body,
  })

  return {
    success: true,
    webhook: {
      ...existing,
      ...updates,
      secret: '••••••••',
      secretPrefix: `${existing.secret.slice(0, 10)}...`,
    },
  }
})
