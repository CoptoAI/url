import { describe, expect, it } from 'vitest'
import { fetch, postJson } from '../utils'

describe('saas audit logs', () => {
  it('records and queries audit logs for organization actions', async () => {
    const email = `audit-${crypto.randomUUID()}@example.com`
    const password = 'AuditPassword123!'

    // 1. Register user and organization
    const regRes = await postJson('/api/auth/register', {
      email,
      password,
      name: 'Auditor User',
      organizationName: 'Audit Org',
    })
    expect(regRes.status).toBe(200)
    const { token, activeOrganization } = await regRes.json() as {
      token: string
      _user: { id: string }
      activeOrganization: { id: string }
    }

    // 2. Query initial audit logs
    const initialRes = await fetch(`/api/organizations/${activeOrganization.id}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(initialRes.status).toBe(200)
    const initialData = await initialRes.json() as { items: Array<{ action: string, actorId: string }> }
    expect(initialData.items).toBeDefined()
    expect(Array.isArray(initialData.items)).toBe(true)

    // 3. Create a webhook which generates an audit log
    const webhookRes = await fetch(`/api/organizations/${activeOrganization.id}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com/audit-webhook',
        events: ['link.created'],
        description: 'Audit test hook',
      }),
    })
    expect(webhookRes.status).toBe(200)

    // 4. Verify audit log contains webhook.created
    const updatedRes = await fetch(`/api/organizations/${activeOrganization.id}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(updatedRes.status).toBe(200)
    const updatedData = await updatedRes.json() as { items: Array<{ action: string, resourceType: string }> }
    const webhookLog = updatedData.items.find(l => l.action === 'webhook.created')
    expect(webhookLog).toBeDefined()
    expect(webhookLog?.resourceType).toBe('webhook')

    // 5. Test filtering by action
    const filteredRes = await fetch(`/api/organizations/${activeOrganization.id}/audit-logs?action=webhook.created`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(filteredRes.status).toBe(200)
    const filteredData = await filteredRes.json() as { items: Array<{ action: string }> }
    expect(filteredData.items.every(l => l.action === 'webhook.created')).toBe(true)
  })
})
