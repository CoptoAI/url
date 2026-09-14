import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { customDomains, links, organizations } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

export interface CloudflareCustomHostnameResult {
  id: string
  hostname: string
  status: 'pending' | 'active' | 'error'
  sslStatus: string
  verificationDns?: {
    cnameTarget?: string
    txtRecordName?: string
    txtRecordValue?: string
  }
}

async function callCloudflareCustomHostnames(event: H3Event, action: 'create' | 'delete' | 'get', domain: string, hostnameId?: string): Promise<CloudflareCustomHostnameResult | null> {
  const config = useRuntimeConfig(event)
  const zoneId = config.cfZoneId
  const apiToken = config.cfApiToken
  const defaultCnameTarget = (config.cfFallbackOrigin as string) || 'cname.shaf.app'

  const isTestDomain = domain.endsWith('.test') || domain.endsWith('.example') || domain.endsWith('.invalid') || domain.endsWith('.localhost')
  if (!zoneId || !apiToken || isTestDomain) {
    // Development / test fallback mock
    return {
      id: hostnameId || `cf_mock_${nanoid()}`,
      hostname: domain,
      status: 'active',
      sslStatus: 'active',
      verificationDns: {
        cnameTarget: defaultCnameTarget,
      },
    }
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  }

  if (action === 'create') {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        hostname: domain,
        ssl: { method: 'http', type: 'dv' },
      }),
    })
    const data = await res.json() as { success: boolean, result: any, errors?: any[] }
    if (!data.success) {
      console.error('Cloudflare Custom Hostnames create error:', JSON.stringify(data.errors || data))
      return null
    }
    return {
      id: data.result.id,
      hostname: data.result.hostname,
      status: data.result.status === 'active' ? 'active' : 'pending',
      sslStatus: data.result.ssl?.status || 'pending',
      verificationDns: {
        cnameTarget: data.result.custom_origin_server || defaultCnameTarget,
        txtRecordName: data.result.ownership_verification?.name,
        txtRecordValue: data.result.ownership_verification?.value,
      },
    }
  }

  if (action === 'delete' && hostnameId) {
    await fetch(`${baseUrl}/${hostnameId}`, {
      method: 'DELETE',
      headers,
    })
    return null
  }

  if (action === 'get' && hostnameId) {
    const res = await fetch(`${baseUrl}/${hostnameId}`, { headers })
    const data = await res.json() as { success: boolean, result: any, errors?: any[] }
    if (!data.success) {
      console.error('Cloudflare Custom Hostnames get error:', JSON.stringify(data.errors || data))
      return null
    }
    return {
      id: data.result.id,
      hostname: data.result.hostname,
      status: data.result.status === 'active' ? 'active' : 'pending',
      sslStatus: data.result.ssl?.status || 'pending',
      verificationDns: {
        cnameTarget: data.result.custom_origin_server || defaultCnameTarget,
        txtRecordName: data.result.ownership_verification?.name,
        txtRecordValue: data.result.ownership_verification?.value,
      },
    }
  }

  return null
}

export async function listCustomDomains(event: H3Event, orgId: string) {
  const db = getD1Database(event)
  return await db.select().from(customDomains).where(eq(customDomains.organizationId, orgId))
}

export async function addCustomDomain(event: H3Event, orgId: string, domain: string) {
  const db = getD1Database(event)

  // Verify organization quota
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  if (!org) {
    throw createError({ status: 404, statusText: 'Organization not found' })
  }

  const existing = await db.select().from(customDomains).where(eq(customDomains.organizationId, orgId))
  if (existing.length >= org.customDomainsQuota) {
    throw createError({
      status: 403,
      statusText: `Custom domain quota reached (${org.customDomainsQuota}). Please upgrade your plan to add more domains.`,
    })
  }

  const normalizedDomain = domain.toLowerCase().trim()
  const cfResult = await callCloudflareCustomHostnames(event, 'create', normalizedDomain)
  const now = Math.floor(Date.now() / 1000)
  const domainId = `dom_${nanoid()}`

  const config = useRuntimeConfig(event)
  const defaultCnameTarget = (config.cfFallbackOrigin as string) || 'cname.shaf.app'

  const [created] = await db.insert(customDomains).values({
    id: domainId,
    organizationId: orgId,
    domain: normalizedDomain,
    cloudflareHostnameId: cfResult?.id || null,
    status: cfResult?.status || 'pending',
    sslStatus: cfResult?.sslStatus || 'initializing',
    verificationDns: cfResult?.verificationDns || { cnameTarget: defaultCnameTarget },
    createdAt: now,
    updatedAt: now,
  }).returning()

  // Cache domain in KV for fast lookup in redirect middleware if active
  if (created && created.status === 'active' && event.context.cloudflare?.env?.KV) {
    await event.context.cloudflare.env.KV.put(
      `domain:lookup:${normalizedDomain}`,
      JSON.stringify({
        organizationId: orgId,
        domainId,
        domain: normalizedDomain,
        rootRedirectUrl: created.rootRedirectUrl || null,
        notFoundRedirectUrl: created.notFoundRedirectUrl || null,
      }),
      { expirationTtl: 86400 },
    )
  }

  try {
    const { dispatchWebhookEvent } = await import('../webhooks')
    await dispatchWebhookEvent(event, {
      organizationId: orgId,
      eventName: 'domain.created',
      payload: { id: domainId, domain: normalizedDomain, status: created?.status },
    })
  }
  catch {
    // Non-blocking
  }

  try {
    const { recordAuditLog } = await import('../audit')
    await recordAuditLog(event, {
      organizationId: orgId,
      action: 'domain.created',
      resourceType: 'custom_domain',
      resourceId: domainId,
      details: { domain: normalizedDomain },
    })
  }
  catch {
    // Non-blocking
  }

  return created!
}

export async function updateCustomDomain(
  event: H3Event,
  orgId: string,
  domainId: string,
  data: { rootRedirectUrl?: string | null, notFoundRedirectUrl?: string | null },
) {
  const db = getD1Database(event)
  const [domain] = await db.select().from(customDomains).where(
    and(eq(customDomains.organizationId, orgId), eq(customDomains.id, domainId)),
  )

  if (!domain) {
    throw createError({ status: 404, statusText: 'Domain not found' })
  }

  const now = Math.floor(Date.now() / 1000)
  const updateValues: { rootRedirectUrl?: string | null, notFoundRedirectUrl?: string | null, updatedAt: number } = {
    updatedAt: now,
  }

  if (data.rootRedirectUrl !== undefined) {
    updateValues.rootRedirectUrl = data.rootRedirectUrl
  }
  if (data.notFoundRedirectUrl !== undefined) {
    updateValues.notFoundRedirectUrl = data.notFoundRedirectUrl
  }

  const [updated] = await db.update(customDomains)
    .set(updateValues)
    .where(eq(customDomains.id, domainId))
    .returning()

  // Update or invalidate KV cache
  const normalizedDomain = domain.domain.toLowerCase()
  if (event.context.cloudflare?.env?.KV) {
    if (updated && updated.status === 'active') {
      await event.context.cloudflare.env.KV.put(
        `domain:lookup:${normalizedDomain}`,
        JSON.stringify({
          organizationId: orgId,
          domainId,
          domain: normalizedDomain,
          rootRedirectUrl: updated.rootRedirectUrl || null,
          notFoundRedirectUrl: updated.notFoundRedirectUrl || null,
        }),
        { expirationTtl: 86400 },
      )
    }
    else {
      await event.context.cloudflare.env.KV.delete(`domain:lookup:${normalizedDomain}`)
    }
  }

  return updated!
}

export async function removeCustomDomain(event: H3Event, orgId: string, domainId: string) {
  const db = getD1Database(event)
  const [domain] = await db.select().from(customDomains).where(and(eq(customDomains.organizationId, orgId), eq(customDomains.id, domainId)))

  if (!domain)
    return

  if (domain.cloudflareHostnameId) {
    await callCloudflareCustomHostnames(event, 'delete', domain.domain, domain.cloudflareHostnameId)
  }

  const now = Math.floor(Date.now() / 1000)
  await db.update(links).set({ customDomainId: null, updatedAt: now }).where(eq(links.customDomainId, domainId))

  await db.delete(customDomains).where(eq(customDomains.id, domainId))

  if (event.context.cloudflare?.env?.KV) {
    await event.context.cloudflare.env.KV.delete(`domain:lookup:${domain.domain.toLowerCase()}`)
  }

  try {
    const { dispatchWebhookEvent } = await import('../webhooks')
    await dispatchWebhookEvent(event, {
      organizationId: orgId,
      eventName: 'domain.deleted',
      payload: { id: domainId, domain: domain.domain },
    })
  }
  catch {
    // Non-blocking
  }

  try {
    const { recordAuditLog } = await import('../audit')
    await recordAuditLog(event, {
      organizationId: orgId,
      action: 'domain.deleted',
      resourceType: 'custom_domain',
      resourceId: domainId,
      details: { domain: domain.domain },
    })
  }
  catch {
    // Non-blocking
  }
}

export async function verifyCustomDomain(event: H3Event, orgId: string, domainId: string) {
  const db = getD1Database(event)
  const [domain] = await db.select().from(customDomains).where(and(eq(customDomains.organizationId, orgId), eq(customDomains.id, domainId)))

  if (!domain) {
    throw createError({ status: 404, statusText: 'Domain not found' })
  }

  if (domain.cloudflareHostnameId) {
    const cfResult = await callCloudflareCustomHostnames(event, 'get', domain.domain, domain.cloudflareHostnameId)
    if (cfResult) {
      const now = Math.floor(Date.now() / 1000)
      const updatePayload: Record<string, unknown> = {
        status: cfResult.status,
        sslStatus: cfResult.sslStatus,
        updatedAt: now,
      }
      if (cfResult.verificationDns) {
        updatePayload.verificationDns = cfResult.verificationDns
      }
      const [updated] = await db.update(customDomains).set(updatePayload).where(eq(customDomains.id, domainId)).returning()

      if (updated && updated.status === 'active' && event.context.cloudflare?.env?.KV) {
        await event.context.cloudflare.env.KV.put(
          `domain:lookup:${domain.domain.toLowerCase()}`,
          JSON.stringify({
            organizationId: orgId,
            domainId,
            domain: domain.domain.toLowerCase(),
            rootRedirectUrl: updated.rootRedirectUrl || null,
            notFoundRedirectUrl: updated.notFoundRedirectUrl || null,
          }),
          { expirationTtl: 86400 },
        )
      }

      if (updated && updated.status === 'active' && domain.status !== 'active') {
        try {
          const { dispatchWebhookEvent } = await import('../webhooks')
          await dispatchWebhookEvent(event, {
            organizationId: orgId,
            eventName: 'domain.verified',
            payload: { id: domainId, domain: domain.domain, status: 'active' },
          })
        }
        catch {
          // Non-blocking
        }
      }

      return updated
    }
  }

  return domain
}

export async function lookupDomainConfig(event: H3Event, hostname: string): Promise<{
  organizationId: string
  domainId: string
  domain: string
  rootRedirectUrl?: string | null
  notFoundRedirectUrl?: string | null
} | null> {
  const normalizedHost = hostname.toLowerCase().split(':')[0]!
  const kv = event.context.cloudflare?.env?.KV

  if (kv) {
    const cached = await kv.get(`domain:lookup:${normalizedHost}`, 'json') as {
      organizationId: string
      domainId: string
      domain: string
      rootRedirectUrl?: string | null
      notFoundRedirectUrl?: string | null
    } | null
    if (cached)
      return cached
  }

  const db = getD1Database(event)
  const [row] = await db.select().from(customDomains).where(eq(customDomains.domain, normalizedHost))
  if (!row || row.status !== 'active')
    return null

  const result = {
    organizationId: row.organizationId,
    domainId: row.id,
    domain: row.domain,
    rootRedirectUrl: row.rootRedirectUrl || null,
    notFoundRedirectUrl: row.notFoundRedirectUrl || null,
  }

  if (kv) {
    await kv.put(`domain:lookup:${normalizedHost}`, JSON.stringify(result), { expirationTtl: 300 })
  }

  return result
}
