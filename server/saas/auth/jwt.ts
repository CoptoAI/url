import type { H3Event } from 'h3'
import { jwtVerify, SignJWT } from 'jose'

export interface UserTokenPayload {
  userId: string
  email: string
  name: string
  organizationId?: string
  role?: string
}

function getJwtSecret(event: H3Event): Uint8Array {
  const config = useRuntimeConfig(event)
  const secret = String(config.jwtSecret || config.siteToken || 'sink-saas-default-jwt-secret-key-32-chars-min')
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(event: H3Event, payload: UserTokenPayload, expiresIn: string = '30d'): Promise<string> {
  const secret = getJwtSecret(event)
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifySessionToken(event: H3Event, token: string): Promise<UserTokenPayload | null> {
  try {
    const secret = getJwtSecret(event)
    const { payload } = await jwtVerify(token, secret)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      organizationId: payload.organizationId as string | undefined,
      role: payload.role as string | undefined,
    }
  }
  catch {
    return null
  }
}
