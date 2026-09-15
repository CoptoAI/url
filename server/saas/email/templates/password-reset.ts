import type { PasswordResetEmailData } from '../types'
import { escapeHtml, renderBaseEmailLayout } from './base'

export function renderPasswordResetEmail(data: PasswordResetEmailData, dashboardBaseUrl: string) {
  const resetUrl = `${dashboardBaseUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(data.resetToken)}`
  const title = 'Reset your Shaf password'
  const preheader = 'We received a request to reset your password for Shaf.'

  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #09090b; line-height: 28px;" class="text-primary">
      Reset your password
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #3f3f46;" class="text-muted">
      We received a request to reset the password for your Shaf account (${escapeHtml(data.toEmail)}). Click the button below to choose a new password:
    </p>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${escapeHtml(resetUrl)}" target="_blank" style="display: inline-block; background-color: #18181b; color: #fafafa; font-size: 15px; font-weight: 500; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        Reset Password
      </a>
    </div>

    <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 20px; color: #71717a;" class="footer-text">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this message—your password will remain unchanged.
    </p>
    <p style="margin: 0; font-size: 12px; line-height: 18px; word-break: break-all;">
      <a href="${escapeHtml(resetUrl)}" style="color: #2563eb; text-decoration: underline;">
        ${escapeHtml(resetUrl)}
      </a>
    </p>
  `

  const html = renderBaseEmailLayout({
    title,
    preheader,
    contentHtml,
  })

  const text = `Reset your password

We received a request to reset the password for your Shaf account (${data.toEmail}).

Reset your password here:
${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this message.`

  return {
    subject: title,
    html,
    text,
  }
}
