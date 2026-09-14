import { and, eq } from 'drizzle-orm'
import { organizationInvites } from '../../../../database/schema'
import { requireOrganizationMember } from '../../../../saas/organizations/service'
import { getD1Database } from '../../../../services/link-store/d1'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const inviteId = getRouterParam(event, 'inviteId')
  const userId = event.context.userID

  if (!orgId || !inviteId) {
    throw createError({ status: 400, statusText: 'Organization ID and Invite ID are required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  const db = getD1Database(event)

  await db.delete(organizationInvites).where(and(
    eq(organizationInvites.id, inviteId),
    eq(organizationInvites.organizationId, orgId),
  ))

  return { success: true }
})
