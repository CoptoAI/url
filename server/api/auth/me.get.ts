import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { getUserOrganizations } from '../../saas/organizations/service'
import { getD1Database } from '../../services/link-store/d1'

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    return {
      authenticated: true,
      authMethod: event.context.authMethod,
      user: {
        id: 'root',
        email: event.context.userEmail || 'root@admin',
        name: 'Administrator',
      },
      organizations: [],
      activeOrganization: null,
    }
  }

  const db = getD1Database(event)
  const [user] = await db.select().from(users).where(eq(users.id, userId))

  if (!user) {
    throw createError({
      status: 404,
      statusText: 'User profile not found',
    })
  }

  const orgs = await getUserOrganizations(event, user.id)
  const activeOrgId = event.context.organizationId
  const activeOrg = orgs.find(o => o.id === activeOrgId) || orgs[0] || null

  return {
    authenticated: true,
    authMethod: event.context.authMethod,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      onboardingCompleted: user.onboardingCompleted,
    },
    organizations: orgs,
    activeOrganization: activeOrg,
  }
})
