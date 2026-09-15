import destr from 'destr'
import { Resend } from 'resend'

export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const webhookSecret = config.resendWebhookSecret as string | undefined
  const apiKey = config.resendApiKey as string | undefined

  // Resend webhook verification requires the raw string body
  const rawBody = (await readRawBody(event, 'utf-8')) || ''

  const svixId = getHeader(event, 'svix-id') || ''
  const svixTimestamp = getHeader(event, 'svix-timestamp') || ''
  const svixSignature = getHeader(event, 'svix-signature') || ''

  if (webhookSecret) {
    const resend = new Resend(apiKey || 're_placeholder')
    try {
      resend.webhooks.verify({
        payload: rawBody,
        headers: {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        },
        secret: webhookSecret,
      })
    }
    catch (err: any) {
      console.error('[Resend Webhook] Signature verification failed:', err.message)
      throw createError({
        statusCode: 401,
        statusMessage: `Webhook verification failed: ${err.message}`,
      })
    }
  }

  const payload = destr<{ type: string, data: Record<string, any>, created_at: string }>(rawBody)
  if (!payload || !payload.type) {
    return { received: true, ignored: true }
  }

  // Handle Resend webhook events
  switch (payload.type) {
    case 'email.delivered': {
      console.info(`[Resend Webhook] Email ${payload.data?.email_id} successfully delivered to ${payload.data?.to}`)
      break
    }
    case 'email.bounced': {
      console.warn(`[Resend Webhook] Email ${payload.data?.email_id} bounced: ${payload.data?.bounce?.message || 'Hard bounce'}`)
      break
    }
    case 'email.complained': {
      console.error(`[Resend Webhook] Spam complaint received for email ${payload.data?.email_id} from ${payload.data?.to}`)
      break
    }
    default: {
      console.info(`[Resend Webhook] Received event: ${payload.type}`)
    }
  }

  return {
    received: true,
    type: payload.type,
  }
})
