import { eq } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { users } from '../../database/schema'
import { createSessionToken } from '../../saas/auth/jwt'
import { hashPassword } from '../../saas/auth/password'
import { createOrganization } from '../../saas/organizations/service'
import { getD1Database } from '../../services/link-store/d1'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

const RegisterSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(64),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, RegisterSchema.parse)
  const db = getD1Database(event)

  // Check if user exists
  const [existing] = await db.select().from(users).where(eq(users.email, body.email))
  if (existing) {
    throw createError({
      status: 400,
      statusText: 'An account with this email already exists',
    })
  }

  const userId = `usr_${nanoid()}`
  const passwordHash = await hashPassword(body.password)
  const now = Math.floor(Date.now() / 1000)

  // Insert user
  const [user] = await db.insert(users).values({
    id: userId,
    email: body.email,
    name: body.name,
    passwordHash,
    role: 'user',
    createdAt: now,
    updatedAt: now,
  }).returning()

  // Create default workspace
  const defaultSlug = body.email.split('@')[0]!.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const org = await createOrganization(event, userId, {
    name: `${body.name}'s Workspace`,
    slug: `${defaultSlug}-${nanoid().slice(0, 4)}`,
  })

  // Issue session token
  const token = await createSessionToken(event, {
    userId: user!.id,
    email: user!.email,
    name: user!.name,
    organizationId: org.id,
    role: 'owner',
  })

  return {
    token,
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
    },
    activeOrganization: org,
  }
})
