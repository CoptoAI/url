import { CreateCustomDomainSchema } from '#shared/schemas/saas'
import { addCustomDomain } from '../../../../saas/domains/service'
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
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  const body = await readValidatedBody(event, CreateCustomDomainSchema.parse)
  const { assertOrganizationQuota } = await import('../../../../saas/billing/service')
  await assertOrganizationQuota(event, orgId, 'domains')

  return await addCustomDomain(event, orgId, body.domain)
})
