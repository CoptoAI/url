import { and, desc, eq, lt } from 'drizzle-orm'
import { AuditLogQuerySchema } from '#shared/schemas/saas'
import { auditLogs } from '../../../../database/schema'
import { requireOrganizationMember } from '../../../../saas/organizations/service'
import { getD1Database } from '../../../../services/link-store/d1'

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
    await requireOrganizationMember(event, orgId, userId, ['owner', 'admin', 'member'])
  }

  const query = await getValidatedQuery(event, AuditLogQuerySchema.parse)
  const db = getD1Database(event)

  const conditions = [eq(auditLogs.organizationId, orgId)]
  if (query.action) {
    conditions.push(eq(auditLogs.action, query.action))
  }
  if (query.resourceType) {
    conditions.push(eq(auditLogs.resourceType, query.resourceType))
  }
  if (query.cursor) {
    const cursorTime = Number.parseInt(query.cursor, 10)
    if (!Number.isNaN(cursorTime)) {
      conditions.push(lt(auditLogs.createdAt, cursorTime))
    }
  }

  const logs = await db.select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(query.limit + 1)

  const hasMore = logs.length > query.limit
  const items = hasMore ? logs.slice(0, query.limit) : logs
  const lastItem = items[items.length - 1]
  const nextCursor = hasMore && lastItem
    ? lastItem.createdAt.toString()
    : null

  return {
    items,
    nextCursor,
  }
})
