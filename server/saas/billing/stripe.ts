import type { H3Event } from 'h3'
import type { SubscriptionPlan } from '#shared/schemas/saas'

export async function createStripeCheckoutSession(
  event: H3Event,
  orgId: string,
  plan: SubscriptionPlan,
  returnUrl: string,
): Promise<{ url: string }> {
  const config = useRuntimeConfig(event)
  const stripeSecretKey = config.stripeSecretKey

  if (!stripeSecretKey) {
    // Development simulation mode
    return {
      url: `${returnUrl}?session_id=mock_stripe_session_${plan}`,
    }
  }

  const priceMap: Record<string, string | undefined> = {
    starter: config.stripePriceIdStarter as string | undefined,
    pro: config.stripePriceIdPro as string | undefined,
    enterprise: config.stripePriceIdEnterprise as string | undefined,
  }

  const priceId = priceMap[plan]
  if (!priceId) {
    throw createError({ status: 400, statusText: `Price ID not configured for plan ${plan}` })
  }

  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('success_url', `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&upgrade=success`)
  params.append('cancel_url', `${returnUrl}?upgrade=cancelled`)
  params.append('client_reference_id', orgId)
  params.append('line_items[0][price]', priceId)
  params.append('line_items[0][quantity]', '1')
  params.append('metadata[organizationId]', orgId)
  params.append('metadata[plan]', plan)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const session = await res.json() as { url?: string, error?: { message: string } }
  if (session.error || !session.url) {
    throw createError({
      status: 500,
      statusText: session.error?.message || 'Failed to create Stripe checkout session',
    })
  }

  return { url: session.url }
}

export async function createStripePortalSession(
  event: H3Event,
  stripeCustomerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const config = useRuntimeConfig(event)
  const stripeSecretKey = config.stripeSecretKey

  if (!stripeSecretKey) {
    return { url: returnUrl }
  }

  const params = new URLSearchParams()
  params.append('customer', stripeCustomerId)
  params.append('return_url', returnUrl)

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const portal = await res.json() as { url?: string, error?: { message: string } }
  if (portal.error || !portal.url) {
    throw createError({
      status: 500,
      statusText: portal.error?.message || 'Failed to create Stripe portal session',
    })
  }

  return { url: portal.url }
}
