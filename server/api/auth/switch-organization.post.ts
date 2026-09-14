import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { organizationMembers, organizations, users } from '../../database/schema'
import { createSessionToken } from '../../saas/auth/jwt'
import { getD1Database } from '../../services/link-store/d1'

const SwitchOrgSchema = z.object({
  organizationId: z.string().min(1),
})

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  const body = await readValidatedBody(event, SwitchOrgSchema.parse)
  const db = getD1Database(event)

  // Verify membership
  const [membership] = await db
    .select({
      role: organizationMembers.role,
      org: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(
      eq(organizationMembers.organizationId, body.organizationId),
      eq(organizationMembers.userId, userId),
    ))
    .limit(1)

  if (!membership) {
    throw createError({
      status: 403,
      statusText: 'You are not a member of this organization',
    })
  }

  // Get user details
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw createError({
      status: 404,
      statusText: 'User not found',
    })
  }

  const token = await createSessionToken(event, {
    userId: user.id,
    email: user.email,
    name: user.name,
    username: user.username || undefined,
    organizationId: membership.org.id,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
  })

  return {
    token,
    organization: {
      ...membership.org,
      role: membership.role,
    },
  }
})
