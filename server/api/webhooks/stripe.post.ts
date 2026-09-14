import type { SubscriptionPlan } from '#shared/schemas/saas'
import { updateOrganizationPlan } from '../../saas/billing/service'
import { verifyStripeWebhookSignature } from '../../saas/billing/stripe'

export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const stripeWebhookSecret = config.stripeWebhookSecret as string | undefined
  const signatureHeader = getHeader(event, 'stripe-signature')
  const rawBody = await readRawBody(event, 'utf-8')

  if (!rawBody) {
    throw createError({ status: 400, statusText: 'Missing webhook body' })
  }

  if (stripeWebhookSecret) {
    const isValid = await verifyStripeWebhookSignature(rawBody, signatureHeader, stripeWebhookSecret)
    if (!isValid) {
      throw createError({ status: 401, statusText: 'Invalid Stripe webhook signature' })
    }
  }

  const body = JSON.parse(rawBody)
  const eventType = body?.type

  if (eventType === 'checkout.session.completed') {
    const session = body.data?.object
    const orgId = session?.client_reference_id || session?.metadata?.organizationId
    const plan = (session?.metadata?.plan || 'pro') as SubscriptionPlan
    const customerId = session?.customer as string
    const subscriptionId = session?.subscription as string

    if (orgId) {
      await updateOrganizationPlan(event, orgId, plan, customerId, subscriptionId)
    }
  }
  else if (eventType === 'customer.subscription.updated') {
    const subscription = body.data?.object
    const orgId = subscription?.metadata?.organizationId
    const plan = (subscription?.metadata?.plan || 'pro') as SubscriptionPlan

    if (orgId) {
      await updateOrganizationPlan(event, orgId, plan, subscription.customer, subscription.id)
    }
  }
  else if (eventType === 'customer.subscription.deleted') {
    const subscription = body.data?.object
    const orgId = subscription?.metadata?.organizationId

    if (orgId) {
      // Downgrade to free tier
      await updateOrganizationPlan(event, orgId, 'free')
    }
  }

  return { received: true }
})
