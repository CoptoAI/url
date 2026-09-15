import type { WorkspaceInviteEmailData } from '../types'
import { escapeHtml, renderBaseEmailLayout } from './base'

export function renderWorkspaceInviteEmail(data: WorkspaceInviteEmailData, dashboardBaseUrl: string) {
  const inviteUrl = `${dashboardBaseUrl.replace(/\/+$/, '')}/invites/${data.inviteToken}`
  const inviter = data.inviterName || data.inviterEmail
  const title = `Join ${data.organizationName} on Shaf`
  const preheader = `${inviter} has invited you to join the ${data.organizationName} workspace on Shaf.`

  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #09090b; line-height: 28px;" class="text-primary">
      You've been invited to collaborate
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #3f3f46;" class="text-muted">
      <strong>${escapeHtml(inviter)}</strong> has invited you to join the <strong>${escapeHtml(data.organizationName)}</strong> workspace on Shaf as an <strong>${escapeHtml(data.role)}</strong>.
    </p>

    <div style="margin: 28px 0; text-align: center;">
      <a href="${escapeHtml(inviteUrl)}" target="_blank" style="display: inline-block; background-color: #18181b; color: #fafafa; font-size: 15px; font-weight: 500; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        Accept Invitation
      </a>
    </div>

    <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 20px; color: #71717a;" class="footer-text">
      This invitation will expire in 7 days. If the button above doesn't work, copy and paste this URL into your browser:
    </p>
    <p style="margin: 0; font-size: 12px; line-height: 18px; word-break: break-all;">
      <a href="${escapeHtml(inviteUrl)}" style="color: #2563eb; text-decoration: underline;">
        ${escapeHtml(inviteUrl)}
      </a>
    </p>
  `

  const html = renderBaseEmailLayout({
    title,
    preheader,
    contentHtml,
  })

  const text = `You've been invited to collaborate

${inviter} has invited you to join the ${data.organizationName} workspace on Shaf as an ${data.role}.

Accept your invitation here:
${inviteUrl}

This invitation link will expire in 7 days.`

  return {
    subject: title,
    html,
    text,
  }
}
