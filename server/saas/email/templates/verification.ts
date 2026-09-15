import type { VerificationEmailData } from '../types'
import { escapeHtml, renderBaseEmailLayout } from './base'

export function renderVerificationEmail(data: VerificationEmailData, dashboardBaseUrl: string) {
  const verifyUrl = `${dashboardBaseUrl.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(data.verificationToken)}`
  const title = 'Verify your email address for Shaf'
  const preheader = 'Please confirm your email address to complete your Shaf account setup.'

  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #09090b; line-height: 28px;" class="text-primary">
      Confirm your email address
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #3f3f46;" class="text-muted">
      Hi ${escapeHtml(data.userName || 'there')}, please confirm that <strong>${escapeHtml(data.toEmail)}</strong> is your email address to finish setting up your account.
    </p>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${escapeHtml(verifyUrl)}" target="_blank" style="display: inline-block; background-color: #18181b; color: #fafafa; font-size: 15px; font-weight: 500; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        Verify Email Address
      </a>
    </div>

    <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 20px; color: #71717a;" class="footer-text">
      If you didn't create an account with Shaf, you can safely ignore this email.
    </p>
    <p style="margin: 0; font-size: 12px; line-height: 18px; word-break: break-all;">
      <a href="${escapeHtml(verifyUrl)}" style="color: #2563eb; text-decoration: underline;">
        ${escapeHtml(verifyUrl)}
      </a>
    </p>
  `

  const html = renderBaseEmailLayout({
    title,
    preheader,
    contentHtml,
  })

  const text = `Confirm your email address

Hi ${data.userName || 'there'}, please confirm your email address (${data.toEmail}) to finish setting up your Shaf account:

${verifyUrl}

If you didn't create an account, you can safely ignore this email.`

  return {
    subject: title,
    html,
    text,
  }
}
