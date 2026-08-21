import { desc, eq } from 'drizzle-orm'
import { webhooks } from '../../../../database/schema'
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
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin', 'member'])
  }

  const db = getD1Database(event)
  const list = await db.select()
    .from(webhooks)
    .where(eq(webhooks.organizationId, orgId))
    .orderBy(desc(webhooks.createdAt))

  return {
    webhooks: list.map(wh => ({
      ...wh,
      secret: '••••••••',
      secretPrefix: `${wh.secret.slice(0, 10)}...`,
    })),
  }
})
