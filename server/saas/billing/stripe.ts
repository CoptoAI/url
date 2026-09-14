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

export async function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader || !secret)
    return false

  const parts = signatureHeader.split(',')
  let timestamp: string | undefined
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.trim().split('=')
    if (key === 't')
      timestamp = value
    else if (key === 'v1' && value)
      signatures.push(value)
  }

  if (!timestamp || !signatures.length)
    return false

  const timestampNum = Number.parseInt(timestamp, 10)
  if (Number.isNaN(timestampNum))
    return false

  const now = Math.floor(Date.now() / 1000)
  if (toleranceSeconds > 0 && Math.abs(now - timestampNum) > toleranceSeconds)
    return false

  const payload = `${timestamp}.${rawBody}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signatures.includes(expectedSignature)
}
