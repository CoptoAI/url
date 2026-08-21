import { listApiKeys } from '../../../../saas/api-keys/service'
import { requireOrganizationMember } from '../../../../saas/organizations/service'

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

  return await listApiKeys(event, orgId)
})
