import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { webhookDeliveries, webhooks } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

export async function signWebhookPayload(secret: string, payload: string, timestamp: number): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const data = encoder.encode(`${timestamp}.${payload}`)
  const signature = await crypto.subtle.sign('HMAC', key, data)
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface DispatchEventOptions {
  organizationId: string
  eventName: string
  payload: Record<string, unknown>
}

export async function dispatchWebhookEvent(event: H3Event, options: DispatchEventOptions): Promise<void> {
  try {
    const db = getD1Database(event)
    const activeWebhooks = await db.select()
      .from(webhooks)
      .where(and(
        eq(webhooks.organizationId, options.organizationId),
        eq(webhooks.isActive, true),
      ))

    if (!activeWebhooks.length)
      return

    for (const webhook of activeWebhooks) {
      if (!webhook.events.includes(options.eventName) && !webhook.events.includes('*')) {
        continue
      }

      await deliverSingleWebhook(event, webhook, options.eventName, options.payload)
    }
  }
  catch (err) {
    console.error('[WebhookDispatcher] Error querying webhooks:', err)
  }
}

export async function deliverSingleWebhook(
  event: H3Event,
  webhook: { id: string, organizationId: string, url: string, secret: string },
  eventName: string,
  payloadData: Record<string, unknown>,
): Promise<{ success: boolean, statusCode?: number, responseBody?: string, durationMs: number }> {
  const db = getD1Database(event)
  const timestamp = Math.floor(Date.now() / 1000)
  const deliveryId = `del_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

  const eventPayload = {
    id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    event: eventName,
    createdAt: timestamp,
    data: payloadData,
  }

  const rawJson = JSON.stringify(eventPayload)
  const signature = await signWebhookPayload(webhook.secret, rawJson, timestamp)
  const signatureHeader = `t=${timestamp},v1=${signature}`

  const startTime = Date.now()
  let statusCode = 0
  let responseBody = ''
  let isSuccess = false

  try {
    const response = await globalThis.fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sink-Webhooks/1.0',
        'X-Sink-Signature': signatureHeader,
        'X-Sink-Event': eventName,
        'X-Sink-Delivery': deliveryId,
      },
      body: rawJson,
      signal: AbortSignal.timeout(10000),
    })

    statusCode = response.status
    isSuccess = response.ok
    const text = await response.text()
    responseBody = text.slice(0, 1024)
  }
  catch (err: unknown) {
    statusCode = 500
    isSuccess = false
    responseBody = err instanceof Error ? err.message : 'Network error or timeout'
  }

  const durationMs = Date.now() - startTime

  try {
    await db.insert(webhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      organizationId: webhook.organizationId,
      event: eventName,
      payload: eventPayload,
      statusCode,
      responseBody,
      durationMs,
      isSuccess,
      createdAt: timestamp,
    })
  }
  catch (err) {
    console.error('[WebhookDelivery] Failed to record delivery log:', err)
  }

  return { success: isSuccess, statusCode, responseBody, durationMs, deliveryId }
}
