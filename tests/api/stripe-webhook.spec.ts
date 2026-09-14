import { describe, expect, it } from 'vitest'
import { verifyStripeWebhookSignature } from '../../server/saas/billing/stripe'
import { fetch, postJson } from '../utils'

describe('stripe webhook handling', () => {
  it('verifies signature helper correctly', async () => {
    const secret = 'whsec_test_secret_12345'
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } })

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`))
    const signature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const signatureHeader = `t=${timestamp},v1=${signature}`

    const isValid = await verifyStripeWebhookSignature(payload, signatureHeader, secret)
    expect(isValid).toBe(true)

    const isInvalid = await verifyStripeWebhookSignature(payload, `t=${timestamp},v1=wrong_sig`, secret)
    expect(isInvalid).toBe(false)
  })

  it('handles checkout session completed and downgrades on subscription deletion', async () => {
    const email = `stripe-${crypto.randomUUID()}@example.com`
    const password = 'StripePassword123!'

    // 1. Register
    const regRes = await postJson('/api/auth/register', {
      email,
      password,
      name: 'Stripe Test User',
      organizationName: 'Stripe Workspace',
    })
    expect(regRes.status).toBe(200)
    const { token, activeOrganization } = await regRes.json() as {
      token: string
      activeOrganization: { id: string, plan: string }
    }
    expect(activeOrganization.plan).toBe('free')

    // 2. Post webhook checkout.session.completed
    const checkoutEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: activeOrganization.id,
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
          metadata: {
            organizationId: activeOrganization.id,
            plan: 'pro',
          },
        },
      },
    }

    const webhookRes = await fetch('/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutEvent),
    })
    expect(webhookRes.status).toBe(200)

    // 3. Verify upgraded usage limits
    const usageRes = await fetch(`/api/organizations/${activeOrganization.id}/billing/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(usageRes.status).toBe(200)
    const usage = await usageRes.json() as { plan: string, limits: { linksQuota: number } }
    expect(usage.plan).toBe('pro')
    expect(usage.limits.linksQuota).toBe(25000)

    // 4. Post customer.subscription.deleted event
    const deleteEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          metadata: {
            organizationId: activeOrganization.id,
          },
        },
      },
    }

    const deleteWebhookRes = await fetch('/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deleteEvent),
    })
    expect(deleteWebhookRes.status).toBe(200)

    // 5. Confirm downgraded to free
    const finalUsageRes = await fetch(`/api/organizations/${activeOrganization.id}/billing/usage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(finalUsageRes.status).toBe(200)
    const finalUsage = await finalUsageRes.json() as { plan: string, limits: { linksQuota: number } }
    expect(finalUsage.plan).toBe('free')
    expect(finalUsage.limits.linksQuota).toBe(100)
  })
})
