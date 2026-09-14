import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { organizationInvites, organizations, users } from '../../../database/schema'
import { getD1Database } from '../../../services/link-store/d1'

const InviteQuerySchema = z.object({
  token: z.string().min(1),
})

export default eventHandler(async (event) => {
  const { token } = await getValidatedQuery(event, InviteQuerySchema.parse)
  const db = getD1Database(event)
  const now = Math.floor(Date.now() / 1000)

  const [invite] = await db
    .select({
      id: organizationInvites.id,
      email: organizationInvites.email,
      role: organizationInvites.role,
      expiresAt: organizationInvites.expiresAt,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      inviterName: users.name,
    })
    .from(organizationInvites)
    .innerJoin(organizations, eq(organizationInvites.organizationId, organizations.id))
    .innerJoin(users, eq(organizationInvites.invitedBy, users.id))
    .where(and(
      eq(organizationInvites.token, token),
      gt(organizationInvites.expiresAt, now),
    ))

  if (!invite) {
    throw createError({
      status: 404,
      statusText: 'Invitation not found or expired',
    })
  }

  return invite
})
