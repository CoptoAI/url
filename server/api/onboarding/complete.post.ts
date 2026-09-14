import { and, eq, ne } from 'drizzle-orm'
import { OnboardingCompleteSchema } from '#shared/schemas/saas'
import { organizationMembers, organizations, users } from '../../database/schema'
import { recordAuditLog } from '../../saas/audit'
import { createSessionToken } from '../../saas/auth/jwt'
import { createOrganization, inviteMember } from '../../saas/organizations/service'
import { getD1Database } from '../../services/link-store/d1'

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  const body = await readValidatedBody(event, OnboardingCompleteSchema.parse)
  const db = getD1Database(event)

  // 1. Check if user exists
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw createError({
      status: 404,
      statusText: 'User not found',
    })
  }

  // 2. Check username uniqueness
  const [existingUsername] = await db.select({ id: users.id })
    .from(users)
    .where(and(eq(users.username, body.username.toLowerCase()), ne(users.id, userId)))
    .limit(1)

  if (existingUsername) {
    throw createError({
      status: 400,
      statusText: 'This username is already taken. Please choose another.',
    })
  }

  const now = Math.floor(Date.now() / 1000)
  let activeOrg: any = null
  let activeRole: 'owner' | 'member' = 'owner'

  // 3. Handle Workspace Creation or Corporate Domain Join
  if (body.action === 'join_workspace') {
    if (!body.joinOrganizationId) {
      throw createError({
        status: 400,
        statusText: 'Organization ID is required to join a workspace',
      })
    }

    const [targetOrg] = await db.select().from(organizations).where(eq(organizations.id, body.joinOrganizationId)).limit(1)
    if (!targetOrg) {
      throw createError({
        status: 404,
        statusText: 'Target workspace not found',
      })
    }

    const userDomain = user.email.split('@')[1]?.toLowerCase()
    const allowed = Array.isArray(targetOrg.allowedDomains) && targetOrg.allowedDomains.some(d => d.toLowerCase() === userDomain)

    if (!allowed) {
      throw createError({
        status: 403,
        statusText: 'Your email domain does not have permission to join this workspace automatically',
      })
    }

    // Check if already a member
    const [existingMember] = await db.select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, targetOrg.id), eq(organizationMembers.userId, userId)))
      .limit(1)

    if (!existingMember) {
      await db.insert(organizationMembers).values({
        organizationId: targetOrg.id,
        userId,
        role: 'member',
        joinedAt: now,
      })
    }

    activeOrg = targetOrg
    activeRole = (existingMember?.role as 'owner' | 'member') || 'member'

    await recordAuditLog(event, {
      organizationId: targetOrg.id,
      actorId: userId,
      actorType: 'user',
      actorEmail: user.email,
      action: 'organization.member_joined_via_domain',
      resourceType: 'organization',
      resourceId: targetOrg.id,
      details: { domain: userDomain },
    })
  }
  else {
    // Standard Workspace Creation
    const workspaceName = body.workspaceName?.trim() || `${user.name}'s Workspace`
    const workspaceSlug = body.workspaceSlug?.trim()
    if (!workspaceSlug) {
      throw createError({
        status: 400,
        statusText: 'Workspace slug is required',
      })
    }

    // Check slug uniqueness
    const [existingSlug] = await db.select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, workspaceSlug.toLowerCase()))
      .limit(1)

    if (existingSlug) {
      throw createError({
        status: 400,
        statusText: 'This workspace slug is already taken. Please choose another.',
      })
    }

    activeOrg = await createOrganization(event, userId, {
      name: workspaceName,
      slug: workspaceSlug.toLowerCase(),
    })
    activeRole = 'owner'

    // Send invites if any
    if (body.invites && body.invites.length > 0) {
      for (const inv of body.invites) {
        try {
          await inviteMember(event, activeOrg.id, userId, inv.email, inv.role)
        }
        catch (err) {
          console.warn(`Failed to invite ${inv.email} during onboarding:`, err)
        }
      }
    }

    await recordAuditLog(event, {
      organizationId: activeOrg.id,
      actorId: userId,
      actorType: 'user',
      actorEmail: user.email,
      action: 'organization.created_during_onboarding',
      resourceType: 'organization',
      resourceId: activeOrg.id,
      details: { teamSize: body.teamSize, invitesCount: body.invites?.length || 0 },
    })
  }

  // 4. Update user record with username, display name, and onboardingCompleted
  const newName = body.name?.trim() || user.name
  const [updatedUser] = await db.update(users)
    .set({
      username: body.username.toLowerCase(),
      name: newName,
      onboardingCompleted: true,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning()

  // 5. Issue refreshed session token
  const token = await createSessionToken(event, {
    userId: updatedUser!.id,
    email: updatedUser!.email,
    name: updatedUser!.name,
    username: updatedUser!.username || undefined,
    organizationId: activeOrg.id,
    role: activeRole,
    onboardingCompleted: true,
  })

  return {
    token,
    user: {
      id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      username: updatedUser!.username,
      avatarUrl: updatedUser!.avatarUrl,
      onboardingCompleted: true,
    },
    organization: activeOrg,
  }
})
