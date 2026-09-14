import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetch, postJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs: string[] = []

beforeAll(async () => {
  await setLinkStoreD1Mode()
})

afterAll(async () => {
  await deleteStoredLinks(createdSlugs)
})

describe('saas webhooks', () => {
  it('creates, lists, delivers events on link lifecycle, tests ping, retries, and deletes webhooks', async () => {
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
    const orgId = activeOrganization.id

    // 2. Create Webhook listening to all events
    const createRes = await fetch(`/api/organizations/${orgId}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com/events',
        events: ['link.created', 'link.updated', 'link.deleted'],
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
    const listRes = await fetch(`/api/organizations/${orgId}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(listRes.status).toBe(200)
    const listData = await listRes.json() as { webhooks: Array<{ id: string, secret: string, url: string }> }
    expect(listData.webhooks.length).toBe(1)
    expect(listData.webhooks[0].id).toBe(webhookId)
    expect(listData.webhooks[0].secret).toBe('••••••••')

    // 4. Test ping delivery endpoint
    const pingRes = await fetch(`/api/organizations/${orgId}/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(pingRes.status).toBe(200)
    const pingData = await pingRes.json() as { isSuccess: boolean, deliveryId: string }
    expect(pingData.deliveryId).toBeDefined()
    const firstDeliveryId = pingData.deliveryId

    // 5. Test manual redelivery / retry endpoint
    const retryRes = await fetch(`/api/organizations/${orgId}/webhooks/${webhookId}/deliveries/${firstDeliveryId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(retryRes.status).toBe(200)
    const retryData = await retryRes.json() as { deliveryId: string }
    expect(retryData.deliveryId).toBeDefined()

    // 6. Test link lifecycle triggers webhooks
    const slug = `wh-link-${crypto.randomUUID().slice(0, 8)}`
    createdSlugs.push(slug)

    // 6A. Link Created
    const createLinkRes = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-organization-id': orgId,
      },
      body: JSON.stringify({
        url: 'https://example.com/initial',
        slug,
      }),
    })
    expect(createLinkRes.status).toBe(201)

    // 6B. Link Updated
    const editLinkRes = await fetch('/api/link/edit', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-organization-id': orgId,
      },
      body: JSON.stringify({
        slug,
        url: 'https://example.com/updated',
      }),
    })
    expect(editLinkRes.status).toBe(201)

    // 6C. Link Deleted
    const deleteLinkRes = await fetch('/api/link/delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-organization-id': orgId,
      },
      body: JSON.stringify({
        slug,
      }),
    })
    expect(deleteLinkRes.status).toBe(204)

    // 7. Inspect deliveries - should include ping, ping retry, link.created, link.updated, link.deleted
    const deliveriesRes = await fetch(`/api/organizations/${orgId}/webhooks/${webhookId}/deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(deliveriesRes.status).toBe(200)
    const deliveriesData = await deliveriesRes.json() as { deliveries: Array<{ id: string, event: string }> }
    const eventNames = deliveriesData.deliveries.map(d => d.event)
    expect(eventNames).toContain('ping')
    expect(eventNames).toContain('link.created')
    expect(eventNames).toContain('link.updated')
    expect(eventNames).toContain('link.deleted')

    // 8. Delete Webhook
    const delRes = await fetch(`/api/organizations/${orgId}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(delRes.status).toBe(200)

    // 9. Confirm deletion in list
    const finalListRes = await fetch(`/api/organizations/${orgId}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(finalListRes.status).toBe(200)
    const finalListData = await finalListRes.json() as { webhooks: Array<{ id: string }> }
    expect(finalListData.webhooks.length).toBe(0)
  })
})
