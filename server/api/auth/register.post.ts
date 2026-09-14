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
  username: z.string().trim().min(3).max(32).regex(/^[a-z0-9_-]+$/).optional(),
  organizationName: z.string().trim().min(2).max(64).optional(),
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

  // Determine if onboarding is completed upfront (e.g. if organizationName is supplied)
  const hasOrgUpfront = Boolean(body.organizationName)
  const username = body.username || (hasOrgUpfront ? body.email.split('@')[0]!.replace(/[^\w-]/g, '').toLowerCase().slice(0, 30) : null)
  const onboardingCompleted = hasOrgUpfront && Boolean(username)

  // Insert user
  const [user] = await db.insert(users).values({
    id: userId,
    email: body.email,
    name: body.name,
    username,
    passwordHash,
    onboardingCompleted,
    role: 'user',
    createdAt: now,
    updatedAt: now,
  }).returning()

  let activeOrg: any = null
  if (hasOrgUpfront) {
    const defaultSlug = body.email.split('@')[0]!.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    activeOrg = await createOrganization(event, userId, {
      name: body.organizationName!,
      slug: `${defaultSlug}-${nanoid().slice(0, 4)}`,
    })
  }

  // Issue session token
  const token = await createSessionToken(event, {
    userId: user!.id,
    email: user!.email,
    name: user!.name,
    username: user!.username || undefined,
    organizationId: activeOrg?.id,
    role: activeOrg ? 'owner' : undefined,
    onboardingCompleted,
  })

  return {
    token,
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      username: user!.username,
      onboardingCompleted,
    },
    activeOrganization: activeOrg,
  }
})
