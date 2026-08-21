import { removeMember, requireOrganizationMember } from '../../../../saas/organizations/service'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const targetUserId = getRouterParam(event, 'userId')
  const currentUserId = event.context.userID

  if (!orgId || !targetUserId) {
    throw createError({ status: 400, statusText: 'Organization ID and User ID are required' })
  }

  if (!currentUserId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (currentUserId !== 'root') {
    // Users can remove themselves, or owners/admins can remove members
    if (currentUserId !== targetUserId) {
      await requireOrganizationMember(event, orgId, currentUserId, ['owner', 'admin'])
    }
  }

  await removeMember(event, orgId, targetUserId)
  return { success: true }
})
