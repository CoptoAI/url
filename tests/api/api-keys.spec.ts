import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetch, postJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs: string[] = []

beforeAll(async () => {
  await setLinkStoreD1Mode()
})

afterAll(async () => {
  await deleteStoredLinks(createdSlugs)
})

describe('api keys & permissions flow', () => {
  it('authenticates via Bearer and X-API-Key headers and enforces permission scopes', async () => {
    const email = `apikey-user-${crypto.randomUUID()}@example.com`
    const password = 'ApiKeyPassword123!'

    // 1. Register User & Org
    const regRes = await postJson('/api/auth/register', {
      email,
      password,
      name: 'API Key Tester',
      organizationName: 'API Org',
    })
    expect(regRes.status).toBe(200)
    const { token, activeOrganization } = await regRes.json() as {
      token: string
      activeOrganization: { id: string }
    }
    const orgId = activeOrganization.id

    // 2. Create Read-Only API Key (links:read only)
    const readKeyRes = await fetch(`/api/organizations/${orgId}/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Read Only Key',
        permissions: ['links:read'],
      }),
    })
    expect(readKeyRes.status).toBe(200)
    const readKeyData = await readKeyRes.json() as { secretKey: string, id: string }
    const readOnlyKey = readKeyData.secretKey
    expect(readOnlyKey).toMatch(/^sk_live_/)

    // 3. Create Full Access API Key (links:read, links:write)
    const writeKeyRes = await fetch(`/api/organizations/${orgId}/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Read Write Key',
        permissions: ['links:read', 'links:write'],
      }),
    })
    expect(writeKeyRes.status).toBe(200)
    const writeKeyData = await writeKeyRes.json() as { secretKey: string, id: string }
    const readWriteKey = writeKeyData.secretKey
    const writeKeyId = writeKeyData.id

    // 4. Test Read-Only Key can list links
    const listWithReadKey = await fetch('/api/link/list', {
      headers: {
        'x-api-key': readOnlyKey,
      },
    })
    expect(listWithReadKey.status).toBe(200)

    // 5. Test Read-Only Key is BLOCKED from creating links (403 Forbidden)
    const testSlug = `test-key-${crypto.randomUUID().slice(0, 8)}`
    createdSlugs.push(testSlug)

    const createBlockedRes = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'x-api-key': readOnlyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com/blocked',
        slug: testSlug,
      }),
    })
    expect(createBlockedRes.status).toBe(403)

    // 6. Test Read-Write Key can create link using Authorization Bearer header
    const createAllowedRes = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${readWriteKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com/allowed',
        slug: testSlug,
      }),
    })
    expect(createAllowedRes.status).toBe(201)

    // 7. Test Read-Write Key can query the link via x-api-key header
    const queryRes = await fetch(`/api/link/query?slug=${testSlug}`, {
      headers: {
        'x-api-key': readWriteKey,
      },
    })
    expect(queryRes.status).toBe(200)

    // 8. Test Read-Write Key can edit the link
    const editRes = await fetch('/api/link/edit', {
      method: 'PUT',
      headers: {
        'x-api-key': readWriteKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: testSlug,
        url: 'https://example.com/allowed-updated',
      }),
    })
    expect(editRes.status).toBe(201)

    // 9. Test Read-Write Key can delete the link
    const delRes = await fetch('/api/link/delete', {
      method: 'POST',
      headers: {
        'x-api-key': readWriteKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: testSlug,
      }),
    })
    expect(delRes.status).toBe(204)

    // 10. Delete the API key and verify revocation
    const revokeRes = await fetch(`/api/organizations/${orgId}/api-keys/${writeKeyId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    expect(revokeRes.status).toBe(200)

    // Now requests with this revoked key must return 401
    const revokedKeyReq = await fetch('/api/link/list', {
      headers: {
        'x-api-key': readWriteKey,
      },
    })
    expect(revokedKeyReq.status).toBe(401)
  })
})
