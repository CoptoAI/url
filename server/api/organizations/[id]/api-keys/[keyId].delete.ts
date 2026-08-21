import { deleteApiKey } from '../../../../saas/api-keys/service'
import { requireOrganizationMember } from '../../../../saas/organizations/service'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const keyId = getRouterParam(event, 'keyId')
  const userId = event.context.userID

  if (!orgId || !keyId) {
    throw createError({ status: 400, statusText: 'Organization ID and Key ID are required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  await deleteApiKey(event, orgId, keyId)
  return { success: true }
})
