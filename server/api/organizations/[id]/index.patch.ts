import { eq } from 'drizzle-orm'
import { UpdateOrganizationSchema } from '#shared/schemas/saas'
import { organizations } from '../../../database/schema'
import { requireOrganizationMember } from '../../../saas/organizations/service'
import { getD1Database } from '../../../services/link-store/d1'

export default eventHandler(async (event) => {
  const orgId = getRouterParam(event, 'id')
  const userId = event.context.userID

  if (!orgId) {
    throw createError({ status: 400, statusText: 'Organization ID is required' })
  }

  if (!userId) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  if (userId !== 'root') {
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin'])
  }

  const body = await readValidatedBody(event, UpdateOrganizationSchema.parse)
  const db = getD1Database(event)
  const now = Math.floor(Date.now() / 1000)

  const [updatedOrg] = await db.update(organizations)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.logo !== undefined ? { logo: body.logo } : {}),
      ...(body.allowedDomains !== undefined ? { allowedDomains: body.allowedDomains } : {}),
      updatedAt: now,
    })
    .where(eq(organizations.id, orgId))
    .returning()

  if (!updatedOrg) {
    throw createError({ status: 404, statusText: 'Organization not found' })
  }

  return updatedOrg
})
