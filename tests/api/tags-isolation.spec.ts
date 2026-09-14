import { beforeAll, describe, expect, it } from 'vitest'
import { fetch, postJson, setLinkStoreD1Mode } from '../utils'

describe('multi-tenant tags isolation', () => {
  beforeAll(async () => {
    await setLinkStoreD1Mode()
  })

  it('isolates tags between different workspaces', async () => {
    const user1Email = `user1-${crypto.randomUUID()}@example.com`
    const user2Email = `user2-${crypto.randomUUID()}@example.com`
    const password = 'TestPassword123!'

    // Register User 1
    const res1 = await postJson('/api/auth/register', {
      email: user1Email,
      password,
      name: 'User One',
      organizationName: 'Workspace One',
    })
    expect(res1.status).toBe(200)
    const { token: token1, activeOrganization: org1 } = await res1.json() as {
      token: string
      activeOrganization: { id: string }
    }

    // Register User 2
    const res2 = await postJson('/api/auth/register', {
      email: user2Email,
      password,
      name: 'User Two',
      organizationName: 'Workspace Two',
    })
    expect(res2.status).toBe(200)
    const { token: token2, activeOrganization: org2 } = await res2.json() as {
      token: string
      activeOrganization: { id: string }
    }

    // User 1 creates link with unique tag
    const slug1 = `slug-u1-${crypto.randomUUID().slice(0, 8)}`
    const tag1 = `tag-org1-${crypto.randomUUID().slice(0, 6)}`
    const createRes1 = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json',
        'x-organization-id': org1.id,
      },
      body: JSON.stringify({
        slug: slug1,
        url: 'https://example.com/org1',
        tags: [tag1],
      }),
    })
    expect(createRes1.status).toBe(201)

    // User 2 creates link with unique tag
    const slug2 = `slug-u2-${crypto.randomUUID().slice(0, 8)}`
    const tag2 = `tag-org2-${crypto.randomUUID().slice(0, 6)}`
    const createRes2 = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token2}`,
        'Content-Type': 'application/json',
        'x-organization-id': org2.id,
      },
      body: JSON.stringify({
        slug: slug2,
        url: 'https://example.com/org2',
        tags: [tag2],
      }),
    })
    expect(createRes2.status).toBe(201)

    // Fetch tags as User 1
    const tagsRes1 = await fetch('/api/link/tags', {
      headers: {
        'Authorization': `Bearer ${token1}`,
        'x-organization-id': org1.id,
      },
    })
    expect(tagsRes1.status).toBe(200)
    const tags1 = await tagsRes1.json() as Array<{ name: string }>
    expect(tags1.some(t => t.name === tag1)).toBe(true)
    expect(tags1.some(t => t.name === tag2)).toBe(false)

    // Fetch tags as User 2
    const tagsRes2 = await fetch('/api/link/tags', {
      headers: {
        'Authorization': `Bearer ${token2}`,
        'x-organization-id': org2.id,
      },
    })
    expect(tagsRes2.status).toBe(200)
    const tags2 = await tagsRes2.json() as Array<{ name: string }>
    expect(tags2.some(t => t.name === tag2)).toBe(true)
    expect(tags2.some(t => t.name === tag1)).toBe(false)
  })
})
