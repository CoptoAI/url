import { z } from 'zod'
import { SubscriptionPlanSchema } from '#shared/schemas/saas'
import { createStripeCheckoutSession } from '../../../../saas/billing/stripe'
import { requireOrganizationMember } from '../../../../saas/organizations/service'

const CheckoutSchema = z.object({
  plan: SubscriptionPlanSchema,
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

  const body = await readValidatedBody(event, CheckoutSchema.parse)
  return await createStripeCheckoutSession(event, orgId, body.plan, body.returnUrl)
})
