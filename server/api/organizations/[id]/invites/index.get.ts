import { and, desc, eq, gt } from 'drizzle-orm'
import { organizationInvites, users } from '../../../../database/schema'
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

  const db = getD1Database(event)
  const now = Math.floor(Date.now() / 1000)

  const rows = await db
    .select({
      id: organizationInvites.id,
      email: organizationInvites.email,
      role: organizationInvites.role,
      token: organizationInvites.token,
      expiresAt: organizationInvites.expiresAt,
      createdAt: organizationInvites.createdAt,
      inviterName: users.name,
    })
    .from(organizationInvites)
    .innerJoin(users, eq(organizationInvites.invitedBy, users.id))
    .where(and(
      eq(organizationInvites.organizationId, orgId),
      gt(organizationInvites.expiresAt, now),
    ))
    .orderBy(desc(organizationInvites.createdAt))

  return rows
})
