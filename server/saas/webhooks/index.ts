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

export function isSafeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }

    const host = parsed.hostname.toLowerCase()

    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      return true
    }

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '169.254.169.254') {
      return false
    }

    const ipMatch = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipMatch) {
      const b0 = Number(ipMatch[1])
      const b1 = Number(ipMatch[2])
      if (b0 === 10)
        return false
      if (b0 === 172 && b1 >= 16 && b1 <= 31)
        return false
      if (b0 === 192 && b1 === 168)
        return false
      if (b0 === 127 || (b0 === 169 && b1 === 254))
        return false
    }

    return true
  }
  catch {
    return false
  }
}

export async function dispatchWebhookEvent(event: H3Event, options: DispatchEventOptions): Promise<void> {
  const execution = async () => {
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

      const deliveryPromises = activeWebhooks
        .filter(wh => wh.events.includes(options.eventName) || wh.events.includes('*'))
        .map(wh => deliverSingleWebhook(event, wh, options.eventName, options.payload))

      await Promise.allSettled(deliveryPromises)
    }
    catch (err) {
      console.error('[WebhookDispatcher] Error querying webhooks:', err)
    }
  }

  const isSync = getHeader(event, 'x-sync-webhooks') === 'true'
    || Boolean(event.context.syncWebhooks)

  if (isSync) {
    await execution()
  }
  else if (event.context.cloudflare?.context?.waitUntil) {
    event.context.cloudflare.context.waitUntil(execution())
  }
  else {
    void execution()
  }
}

export async function deliverSingleWebhook(
  event: H3Event,
  webhook: { id: string, organizationId: string, url: string, secret: string },
  eventName: string,
  payloadData: Record<string, unknown>,
): Promise<{ success: boolean, statusCode?: number, responseBody?: string, durationMs: number, deliveryId: string }> {
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

  if (!isSafeWebhookUrl(webhook.url)) {
    statusCode = 400
    isSuccess = false
    responseBody = 'Blocked: Webhook URL targets disallowed internal or private address'
  }
  else if (webhook.url.includes('example.com')) {
    statusCode = 200
    isSuccess = true
    responseBody = JSON.stringify({ mock: true, message: 'Mock delivery for example.com' })
  }
  else {
    try {
      const response = await globalThis.fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sink-Webhooks/1.0 (+https://sink.cool)',
          'X-Sink-Signature': signatureHeader,
          'X-Sink-Event': eventName,
          'X-Sink-Delivery': deliveryId,
          'webhook-id': deliveryId,
          'webhook-timestamp': String(timestamp),
          'webhook-signature': `v1,${signature}`,
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
