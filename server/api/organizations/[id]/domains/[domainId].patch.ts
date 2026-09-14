import { UpdateCustomDomainSchema } from '#shared/schemas/saas'
import { updateCustomDomain } from '../../../../saas/domains/service'
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

  const body = await readValidatedBody(event, UpdateCustomDomainSchema.parse)
  return await updateCustomDomain(event, orgId, domainId, body)
})
