import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { organizations } from '../../server/database/schema'
import { db, deleteStoredLinks, fetch, postJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs: string[] = []

beforeAll(async () => {
  await setLinkStoreD1Mode()
})

afterAll(async () => {
  await deleteStoredLinks(createdSlugs)
})

describe('custom domains & subdomains', () => {
  it('manages custom domains, configures redirects, and resolves links at the edge', async () => {
    const email = `domain-user-${crypto.randomUUID()}@example.com`
    const password = 'DomainPassword123!'
    const domainName = `links-${crypto.randomUUID().slice(0, 8)}.branded.test`
    const slug = `slug-${crypto.randomUUID().slice(0, 8)}`
    createdSlugs.push(slug)

    // 1. Register user and organization
    const regRes = await postJson('/api/auth/register', {
      email,
      password,
      name: 'Domain Tester',
      organizationName: 'Branded Org',
    })
    expect(regRes.status).toBe(200)
    const { token, activeOrganization } = await regRes.json() as {
      token: string
      activeOrganization: { id: string }
    }
    const orgId = activeOrganization.id

    // 2. Free plan should reject adding custom domain due to quota 0
    const quotaFailRes = await fetch(`/api/organizations/${orgId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: domainName,
      }),
    })
    expect(quotaFailRes.status).toBe(403)

    // Upgrade organization quota
    await db.update(organizations).set({ customDomainsQuota: 5, plan: 'pro' }).where(eq(organizations.id, orgId))

    // 3. Add custom domain with available quota
    const addDomainRes = await fetch(`/api/organizations/${orgId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: domainName,
      }),
    })
    expect(addDomainRes.status).toBe(200)
    const domainRecord = await addDomainRes.json() as {
      id: string
      domain: string
      status: string
      rootRedirectUrl: string | null
      notFoundRedirectUrl: string | null
    }
    expect(domainRecord.id).toBeDefined()
    expect(domainRecord.domain).toBe(domainName)
    const domainId = domainRecord.id

    // 3. List custom domains
    const listDomainsRes = await fetch(`/api/organizations/${orgId}/domains`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(listDomainsRes.status).toBe(200)
    const domainsList = await listDomainsRes.json() as Array<{ id: string, domain: string }>
    expect(domainsList.some(d => d.id === domainId)).toBe(true)

    // 4. Update domain redirect configuration (root & notFound)
    const rootRedirect = 'https://branded-homepage.test'
    const notFoundRedirect = 'https://branded-homepage.test/404'
    const updateRes = await fetch(`/api/organizations/${orgId}/domains/${domainId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rootRedirectUrl: rootRedirect,
        notFoundRedirectUrl: notFoundRedirect,
      }),
    })
    expect(updateRes.status).toBe(200)
    const updatedDomain = await updateRes.json() as {
      id: string
      rootRedirectUrl: string | null
      notFoundRedirectUrl: string | null
    }
    expect(updatedDomain.rootRedirectUrl).toBe(rootRedirect)
    expect(updatedDomain.notFoundRedirectUrl).toBe(notFoundRedirect)

    // 5. Create a link tied to this custom domain
    const targetUrl = 'https://destination.test/landing-page'
    const createLinkRes = await fetch('/api/link/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        slug,
        customDomainId: domainId,
      }),
    })
    expect(createLinkRes.status).toBe(201)
    const createLinkData = await createLinkRes.json() as { link: { customDomainId?: string, slug: string } }
    expect(createLinkData.link.customDomainId).toBe(domainId)

    // 6. List links filtered by domainId
    const listFilteredLinksRes = await fetch(`/api/link/list?domainId=${domainId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(listFilteredLinksRes.status).toBe(200)
    const filteredData = await listFilteredLinksRes.json() as { links: Array<{ slug: string, customDomainId?: string }> }
    expect(filteredData.links.some(l => l.slug === slug)).toBe(true)

    // 7. Test Root Redirect via Custom Domain Host
    const rootEdgeRes = await fetch('/', {
      redirect: 'manual',
      headers: {
        Host: domainName,
      },
    })
    expect(rootEdgeRes.status).toBe(302)
    expect(rootEdgeRes.headers.get('Location')).toBe(rootRedirect)

    // 8. Test Link Resolution via Custom Domain Host
    const slugEdgeRes = await fetch(`/${slug}`, {
      redirect: 'manual',
      headers: {
        Host: domainName,
      },
    })
    expect(slugEdgeRes.status).toBe(301)
    expect(slugEdgeRes.headers.get('Location')).toBe(targetUrl)

    // 9. Test 404 Not Found Redirect via Custom Domain Host
    const notFoundEdgeRes = await fetch(`/non-existent-${crypto.randomUUID().slice(0, 8)}`, {
      redirect: 'manual',
      headers: {
        Host: domainName,
      },
    })
    expect(notFoundEdgeRes.status).toBe(302)
    expect(notFoundEdgeRes.headers.get('Location')).toBe(notFoundRedirect)

    // 10. Delete Custom Domain
    const deleteDomainRes = await fetch(`/api/organizations/${orgId}/domains/${domainId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(deleteDomainRes.status).toBe(200)
  })
})
