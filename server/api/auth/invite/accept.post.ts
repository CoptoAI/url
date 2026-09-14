import { and, eq, gt } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { organizationInvites, organizationMembers, organizations, users } from '../../../database/schema'
import { recordAuditLog } from '../../../saas/audit'
import { createSessionToken } from '../../../saas/auth/jwt'
import { hashPassword, verifyPassword } from '../../../saas/auth/password'
import { getD1Database } from '../../../services/link-store/d1'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(2).max(64).optional(),
  password: z.string().min(8).optional(),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, AcceptInviteSchema.parse)
  const db = getD1Database(event)
  const now = Math.floor(Date.now() / 1000)

  // Find valid invite
  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(and(
      eq(organizationInvites.token, body.token),
      gt(organizationInvites.expiresAt, now),
    ))

  if (!invite) {
    throw createError({
      status: 404,
      statusText: 'Invitation not found or expired',
    })
  }

  // Get target organization
  const [org] = await db.select().from(organizations).where(eq(organizations.id, invite.organizationId))
  if (!org) {
    throw createError({
      status: 404,
      statusText: 'Organization no longer exists',
    })
  }

  let user: typeof users.$inferSelect | undefined

  // Check if current user is logged in
  if (event.context.userID && event.context.userID !== 'root') {
    const [existing] = await db.select().from(users).where(eq(users.id, event.context.userID))
    user = existing
  }

  // If not logged in, check if user exists with invite email or create new
  if (!user) {
    const [existingByEmail] = await db.select().from(users).where(eq(users.email, invite.email.toLowerCase()))
    if (existingByEmail) {
      if (body.password) {
        if (!existingByEmail.passwordHash || !await verifyPassword(body.password, existingByEmail.passwordHash)) {
          throw createError({ status: 401, statusText: 'Incorrect password for existing account' })
        }
      }
      user = existingByEmail
    }
    else {
      if (!body.password || !body.name) {
        throw createError({
          status: 400,
          statusText: 'Name and password required to set up your account',
        })
      }
      const userId = `usr_${nanoid()}`
      const passwordHash = await hashPassword(body.password)
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: invite.email.toLowerCase(),
        name: body.name,
        passwordHash,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      }).returning()
      user = newUser
    }
  }

  if (!user) {
    throw createError({ status: 500, statusText: 'Failed to resolve user account' })
  }

  // Insert or update membership
  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: user.id,
    role: invite.role,
    joinedAt: now,
  }).onConflictDoUpdate({
    target: [organizationMembers.organizationId, organizationMembers.userId],
    set: { role: invite.role },
  })

  // Delete invite
  await db.delete(organizationInvites).where(eq(organizationInvites.id, invite.id))

  // Audit log
  await recordAuditLog(event, {
    organizationId: org.id,
    actorId: user.id,
    actorType: 'user',
    actorEmail: user.email,
    action: 'member.joined',
    resourceType: 'organization_member',
    resourceId: user.id,
    details: { role: invite.role, invitedEmail: invite.email },
  })

  // Generate new JWT session token for accepted workspace
  const token = await createSessionToken(event, {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: org.id,
    role: invite.role,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    activeOrganization: org,
  }
})
