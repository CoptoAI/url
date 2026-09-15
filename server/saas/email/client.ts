import type { H3Event } from 'h3'
import type { EmailPayload, EmailResult } from './types'
import { Resend } from 'resend'

let resendInstance: Resend | null = null

export function getResendClient(event?: H3Event): Resend | null {
  const config = useRuntimeConfig(event)
  const apiKey = config.resendApiKey as string | undefined

  if (!apiKey) {
    return null
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey)
  }

  return resendInstance
}

export async function sendEmailWithRetry(
  event: H3Event | undefined,
  payload: EmailPayload,
  maxRetries = 2,
): Promise<EmailResult> {
  const config = useRuntimeConfig(event)
  const apiKey = config.resendApiKey as string | undefined
  const defaultFrom = (config.resendFromEmail as string) || 'Shaf <notifications@shaf.app>'

  const from = payload.from || defaultFrom
  const resend = getResendClient(event)

  // Dev / Mock fallback mode if API key is not configured
  if (!resend || !apiKey) {
    console.info(`[Email Service Mock] Sending email to: ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}`)
    console.info(`[Email Service Mock] Subject: "${payload.subject}"`)
    if (payload.idempotencyKey) {
      console.info(`[Email Service Mock] Idempotency Key: ${payload.idempotencyKey}`)
    }
    return {
      success: true,
      id: `mock_${Date.now()}`,
      mock: true,
    }
  }

  let attempt = 0
  let lastError = 'Unknown error'

  while (attempt <= maxRetries) {
    try {
      const response = await resend.emails.send(
        {
          from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          replyTo: payload.replyTo,
          tags: payload.tags,
        },
        payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : undefined,
      )

      // Resend SDK does NOT throw on API errors—it returns { data, error }
      if (response.error) {
        lastError = response.error.message
        const statusCode = (response.error as { statusCode?: number }).statusCode

        // Safe to retry on 429 (rate limit) or 500 (server error)
        if (attempt < maxRetries && (statusCode === 429 || statusCode === 500)) {
          attempt++
          const backoffMs = 2 ** attempt * 500 + Math.random() * 200
          console.warn(`[Email Service] Rate limited or API error (${response.error.name}). Retrying in ${Math.round(backoffMs)}ms...`)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
          continue
        }

        console.error(`[Email Service] Failed to send email: ${response.error.message}`, response.error)
        return {
          success: false,
          error: response.error.message,
        }
      }

      if (response.data) {
        return {
          success: true,
          id: response.data.id,
        }
      }
    }
    catch (err: any) {
      // Network transport or runtime fetch errors
      lastError = err?.message || String(err)
      if (attempt < maxRetries) {
        attempt++
        const backoffMs = 2 ** attempt * 500
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        continue
      }
      break
    }
  }

  return {
    success: false,
    error: lastError,
  }
}
