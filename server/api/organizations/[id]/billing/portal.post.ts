import { z } from 'zod'
import { createStripePortalSession } from '../../../../saas/billing/stripe'
import { getOrganizationById, requireOrganizationMember } from '../../../../saas/organizations/service'

const PortalSchema = z.object({
  returnUrl: z.string().url(),
})

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
    await requireOrganizationMember(event, orgId, userId, ['owner'])
  }

  const org = await getOrganizationById(event, orgId)
  if (!org || !org.stripeCustomerId) {
    throw createError({
      status: 400,
      statusText: 'No active Stripe customer found for this organization.',
    })
  }

  const body = await readValidatedBody(event, PortalSchema.parse)
  return await createStripePortalSession(event, org.stripeCustomerId, body.returnUrl)
})
