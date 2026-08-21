import { describe, expect, it } from 'vitest'
import { fetch, postJson } from '../utils'

describe('saas webhooks', () => {
  it('creates, lists, tests ping, and deletes webhooks', async () => {
    const email = `webhook-${crypto.randomUUID()}@example.com`
    const password = 'WebhookPassword123!'

    // 1. Register
    const regRes = await postJson('/api/auth/register', {
      email,
      password,
      name: 'Webhook User',
      organizationName: 'Webhook Org',
    })
    expect(regRes.status).toBe(200)
    const { token, activeOrganization } = await regRes.json() as {
      token: string
      activeOrganization: { id: string }
    }

    // 2. Create Webhook
    const createRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com/events',
        events: ['link.created', 'link.deleted'],
        description: 'Test Webhook Endpoint',
      }),
    })
    expect(createRes.status).toBe(200)
    const createData = await createRes.json() as { webhook: { id: string, secret: string, secretPrefix: string } }
    expect(createData.webhook.id).toBeDefined()
    expect(createData.webhook.secret).toMatch(/^whsec_/)
    expect(createData.webhook.secretPrefix).toMatch(/^whsec_/)

    const webhookId = createData.webhook.id

    // 3. List Webhooks (secret must be masked)
    const listRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(listRes.status).toBe(200)
    const listData = await listRes.json() as { webhooks: Array<{ id: string, secret: string, url: string }> }
    expect(listData.webhooks.length).toBe(1)
    expect(listData.webhooks[0].id).toBe(webhookId)
    expect(listData.webhooks[0].secret).toBe('••••••••')

    // 4. Update Webhook
    const patchRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks/${webhookId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isActive: false,
      }),
    })
    expect(patchRes.status).toBe(200)
    const patchData = await patchRes.json() as { webhook: { isActive: boolean } }
    expect(patchData.webhook.isActive).toBe(false)

    // 5. Test ping delivery endpoint
    const pingRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(pingRes.status).toBe(200)
    const pingData = await pingRes.json() as { isSuccess: boolean, deliveryId: string }
    expect(pingData.deliveryId).toBeDefined()

    // 6. Inspect deliveries
    const deliveriesRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks/${webhookId}/deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(deliveriesRes.status).toBe(200)
    const deliveriesData = await deliveriesRes.json() as { deliveries: Array<{ id: string, event: string }> }
    expect(deliveriesData.deliveries.length).toBeGreaterThan(0)
    expect(deliveriesData.deliveries[0].event).toBe('ping')

    // 7. Delete Webhook
    const delRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(delRes.status).toBe(200)

    // 8. Confirm deletion in list
    const finalListRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(finalListRes.status).toBe(200)
    const finalListData = await finalListRes.json() as { webhooks: Array<{ id: string }> }
    expect(finalListData.webhooks.length).toBe(0)
  })
})
