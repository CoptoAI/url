import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../database/schema'
import { createSessionToken } from '../../saas/auth/jwt'
import { verifyPassword } from '../../saas/auth/password'
import { getUserOrganizations } from '../../saas/organizations/service'
import { getD1Database } from '../../services/link-store/d1'

const LoginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, LoginSchema.parse)
  const db = getD1Database(event)

  const [user] = await db.select().from(users).where(eq(users.email, body.email))
  if (!user || !user.passwordHash) {
    throw createError({
      status: 401,
      statusText: 'Invalid email or password',
    })
  }

  const isValid = await verifyPassword(body.password, user.passwordHash)
  if (!isValid) {
    throw createError({
      status: 401,
      statusText: 'Invalid email or password',
    })
  }

  const userOrgs = await getUserOrganizations(event, user.id)
  const primaryOrg = userOrgs[0]

  const token = await createSessionToken(event, {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: primaryOrg?.id,
    role: primaryOrg?.role,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    organizations: userOrgs,
    activeOrganization: primaryOrg || null,
  }
})
