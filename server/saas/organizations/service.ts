import type { H3Event } from 'h3'
import type { OrganizationRole } from '#shared/schemas/saas'
import { and, eq } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { organizationInvites, organizationMembers, organizations, users } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

export async function createOrganization(event: H3Event, userId: string, data: { name: string, slug: string, logo?: string }): Promise<typeof organizations.$inferSelect> {
  const db = getD1Database(event)
  const orgId = `org_${nanoid()}`
  const now = Math.floor(Date.now() / 1000)

  const [org] = await db.insert(organizations).values({
    id: orgId,
    name: data.name,
    slug: data.slug.toLowerCase(),
    logo: data.logo || null,
    plan: 'free',
    linksQuota: 100,
    clicksQuotaMonthly: 10000,
    customDomainsQuota: 0,
    teamSeatsQuota: 1,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await db.insert(organizationMembers).values({
    organizationId: orgId,
    userId,
    role: 'owner',
    joinedAt: now,
  })

  return org!
}

export async function getUserOrganizations(event: H3Event, userId: string) {
  const db = getD1Database(event)
  const memberships = await db.select({
    role: organizationMembers.role,
    org: organizations,
  })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))

  return memberships.map(m => ({
    ...m.org,
    role: m.role as OrganizationRole,
  }))
}

export async function getOrganizationById(event: H3Event, orgId: string) {
  const db = getD1Database(event)
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  return org || null
}

export async function getOrganizationMembers(event: H3Event, orgId: string) {
  const db = getD1Database(event)
  const rows = await db.select({
    organizationId: organizationMembers.organizationId,
    userId: organizationMembers.userId,
    role: organizationMembers.role,
    joinedAt: organizationMembers.joinedAt,
    user: {
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    },
  })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, orgId))

  return rows
}

export async function requireOrganizationMember(event: H3Event, orgId: string, userId: string, allowedRoles: OrganizationRole[] = ['owner', 'admin', 'member', 'viewer']) {
  const db = getD1Database(event)
  const [member] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)))

  if (!member || !allowedRoles.includes(member.role as OrganizationRole)) {
    throw createError({
      status: 403,
      statusText: 'Forbidden: Insufficient organization permissions',
    })
  }

  return member
}

export async function inviteMember(event: H3Event, orgId: string, invitedByUserId: string, email: string, role: OrganizationRole) {
  const db = getD1Database(event)
  const token = `inv_${customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32)()}`
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + (7 * 24 * 60 * 60) // 7 days

  const [invite] = await db.insert(organizationInvites).values({
    id: `inv_${nanoid()}`,
    organizationId: orgId,
    email: email.toLowerCase(),
    role,
    token,
    expiresAt,
    invitedBy: invitedByUserId,
    createdAt: now,
  }).returning()

  return invite!
}

export async function removeMember(event: H3Event, orgId: string, userIdToRemove: string) {
  const db = getD1Database(event)
  await db.delete(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userIdToRemove)))
}

export async function updateMemberRole(event: H3Event, orgId: string, userIdToUpdate: string, newRole: OrganizationRole) {
  const db = getD1Database(event)
  await db.update(organizationMembers)
    .set({ role: newRole })
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userIdToUpdate)))
}
