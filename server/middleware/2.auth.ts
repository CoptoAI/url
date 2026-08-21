import { timingSafeEqual } from 'node:crypto'
import { verifyApiKey } from '../saas/api-keys/service'
import { verifySessionToken } from '../saas/auth/jwt'

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/invite/',
  '/api/webhooks/',
]

export default eventHandler(async (event) => {
  if (!event.path.startsWith('/api/'))
    return

  // Allow public auth and webhook routes without credentials
  if (PUBLIC_API_PREFIXES.some(prefix => event.path.startsWith(prefix)))
    return

  const authHeader = getHeader(event, 'Authorization')
  const token = authHeader?.replace(/^Bearer\s+/, '')

  // 1. API Key Authentication (e.g. sk_live_...)
  if (token?.startsWith('sk_live_')) {
    const apiKeyData = await verifyApiKey(event, token)
    if (apiKeyData) {
      event.context.authMethod = 'api-key'
      event.context.userID = apiKeyData.userId
      event.context.organizationId = apiKeyData.organizationId
      event.context.permissions = apiKeyData.permissions
      return
    }
    throw createError({
      status: 401,
      statusText: 'Invalid or expired API key',
    })
  }

  // 2. Multi-tenant Session JWT
  if (token && token.length > 32) {
    const session = await verifySessionToken(event, token)
    if (session) {
      event.context.authMethod = 'session-jwt'
      event.context.userID = session.userId
      event.context.userEmail = session.email
      event.context.userName = session.name
      // Support passing active organization via header or defaulting to token payload
      const requestedOrgId = getHeader(event, 'x-organization-id') || session.organizationId
      event.context.organizationId = requestedOrgId
      return
    }
  }

  // 3. Legacy / Root Site Token (backward compatible)
  if (await verifySiteToken(token, useRuntimeConfig(event).siteToken)) {
    event.context.authMethod = 'site-token'
    event.context.userID = 'root'
    event.context.userEmail = `root@${getRequestURL(event).hostname}`
    return
  }

  // 4. Cloudflare Access Identity (backward compatible)
  const accessIdentity = await verifyCloudflareAccess(event)
  if (accessIdentity) {
    if (isCloudflareAccessRequestAllowed(event)) {
      Object.assign(
        event.context,
        mapCloudflareAccessIdentity(accessIdentity, getRequestURL(event).hostname),
      )
      return
    }

    throw createError({
      status: 403,
      statusText: 'Forbidden',
    })
  }

  if (token && token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }

  throw createError({
    status: 401,
    statusText: 'Unauthorized',
  })
})

async function verifySiteToken(provided: string | undefined, expected: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided || '')),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  return timingSafeEqual(new Uint8Array(providedHash), new Uint8Array(expectedHash))
}
