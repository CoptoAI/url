import { UpdateMemberRoleSchema } from '#shared/schemas/saas'
import { requireOrganizationMember, updateMemberRole } from '../../../../saas/organizations/service'

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
    await requireOrganizationMember(event, orgId, currentUserId, ['owner'])
  }

  const body = await readValidatedBody(event, UpdateMemberRoleSchema.parse)
  await updateMemberRole(event, orgId, targetUserId, body.role)

  return { success: true }
})
