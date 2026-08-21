import { removeCustomDomain } from '../../../../saas/domains/service'
import { requireOrganizationMember } from '../../../../saas/organizations/service'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const domainId = getRouterParam(event, 'domainId')
  const userId = event.context.userID

  if (!orgId || !domainId) {
    throw createError({ status: 400, statusText: 'Organization ID and Domain ID are required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  await removeCustomDomain(event, orgId, domainId)
  return { success: true }
})
