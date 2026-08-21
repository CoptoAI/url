import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { apiKeys } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)
const secretAlphabet = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32)

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(str))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export async function createApiKey(
  event: H3Event,
  orgId: string,
  userId: string,
  name: string,
  permissions: string[] = ['links:read', 'links:write'],
  expiresInDays?: number,
) {
  const db = getD1Database(event)
  const id = `key_${nanoid()}`
  const keyPrefix = `sk_live_${customAlphabet('0123456789abcdef', 8)()}`
  const secretRandom = secretAlphabet()
  const rawSecret = `${keyPrefix}_${secretRandom}`
  const keyHash = await sha256(rawSecret)

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = expiresInDays ? now + (expiresInDays * 24 * 60 * 60) : null

  await db.insert(apiKeys).values({
    id,
    organizationId: orgId,
    userId,
    name,
    keyPrefix,
    keyHash,
    permissions,
    expiresAt,
    createdAt: now,
  })

  return {
    id,
    organizationId: orgId,
    name,
    keyPrefix,
    permissions,
    expiresAt,
    createdAt: now,
    secretKey: rawSecret,
  }
}

export async function verifyApiKey(event: H3Event, rawKey: string) {
  if (!rawKey.startsWith('sk_live_'))
    return null

  const parts = rawKey.split('_')
  if (parts.length < 3)
    return null

  const keyPrefix = `${parts[0]}_${parts[1]}_${parts[2]}`
  const db = getD1Database(event)

  const [found] = await db.select().from(apiKeys).where(eq(apiKeys.keyPrefix, keyPrefix))
  if (!found)
    return null

  const now = Math.floor(Date.now() / 1000)
  if (found.expiresAt && found.expiresAt < now)
    return null

  const inputHash = await sha256(rawKey)
  const encoder = new TextEncoder()
  const isMatch = timingSafeEqual(encoder.encode(inputHash), encoder.encode(found.keyHash))
  if (!isMatch)
    return null

  // Update last used at timestamp asynchronously
  event.context.cloudflare?.context?.waitUntil?.(
    db.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.id, found.id)),
  )

  return {
    organizationId: found.organizationId,
    userId: found.userId,
    permissions: (found.permissions as string[]) || [],
  }
}

export async function listApiKeys(event: H3Event, orgId: string) {
  const db = getD1Database(event)
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.organizationId, orgId))
  return rows.map(row => ({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    permissions: (row.permissions as string[]) || [],
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }))
}

export async function deleteApiKey(event: H3Event, orgId: string, keyId: string) {
  const db = getD1Database(event)
  await db.delete(apiKeys).where(and(eq(apiKeys.organizationId, orgId), eq(apiKeys.id, keyId)))
}
