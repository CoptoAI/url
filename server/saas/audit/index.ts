import type { H3Event } from 'h3'
import { auditLogs } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

export interface RecordAuditOptions {
  organizationId: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, unknown>
  actorId?: string
  actorType?: 'user' | 'api_key' | 'system'
  actorEmail?: string
}

export async function recordAuditLog(event: H3Event, options: RecordAuditOptions): Promise<void> {
  try {
    const db = getD1Database(event)
    const actorId = options.actorId || event.context.userID || 'system'
    const actorType = options.actorType || (event.context.authMethod === 'api-key' ? 'api_key' : 'user')
    const actorEmail = options.actorEmail || (event.context.authMethod === 'site-token' ? 'root@sink.internal' : undefined)

    const ipAddress = getRequestHeader(event, 'cf-connecting-ip')
      || getRequestHeader(event, 'x-forwarded-for')
      || '127.0.0.1'
    const userAgent = getRequestHeader(event, 'user-agent') || 'Sink-Agent'

    const id = `audit_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const now = Math.floor(Date.now() / 1000)

    await db.insert(auditLogs).values({
      id,
      organizationId: options.organizationId,
      actorId,
      actorType,
      actorEmail,
      action: options.action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress,
      userAgent,
      createdAt: now,
    })
  }
  catch (err) {
    console.error('[AuditLog] Failed to record audit entry:', err)
  }
}
