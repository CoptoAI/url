import type { H3Event } from 'h3'
import type { PasswordResetEmailData, VerificationEmailData, WorkspaceInviteEmailData } from './types'
import { sendEmailWithRetry } from './client'
import { renderWorkspaceInviteEmail } from './templates/invitation'
import { renderPasswordResetEmail } from './templates/password-reset'
import { renderVerificationEmail } from './templates/verification'

function getDashboardBaseUrl(event?: H3Event): string {
  const config = useRuntimeConfig(event)
  const dashboardDomain = (config.public.dashboardDomain as string) || (config.dashboardDomain as string) || 'dash.shaf.app'
  const isLocal = dashboardDomain.includes('localhost') || dashboardDomain.includes('127.0.0.1')
  const protocol = isLocal ? 'http://' : 'https://'
  return `${protocol}${dashboardDomain}`
}

/**
 * Sends a workspace team invitation email with idempotency and tracking tags.
 */
export async function sendWorkspaceInviteEmail(event: H3Event | undefined, data: WorkspaceInviteEmailData) {
  const dashboardBaseUrl = getDashboardBaseUrl(event)
  const template = renderWorkspaceInviteEmail(data, dashboardBaseUrl)

  return sendEmailWithRetry(event, {
    to: data.toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `org-invite/${data.inviteId}`,
    tags: [
      { name: 'category', value: 'workspace-invitation' },
      { name: 'invite_id', value: data.inviteId },
    ],
  })
}

/**
 * Sends an email verification link to a user.
 */
export async function sendVerificationEmail(event: H3Event | undefined, data: VerificationEmailData) {
  const dashboardBaseUrl = getDashboardBaseUrl(event)
  const template = renderVerificationEmail(data, dashboardBaseUrl)

  return sendEmailWithRetry(event, {
    to: data.toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `verify-email/${data.userId}/${data.verificationToken.slice(-10)}`,
    tags: [
      { name: 'category', value: 'verification' },
      { name: 'user_id', value: data.userId },
    ],
  })
}

/**
 * Sends a password reset email to a user.
 */
export async function sendPasswordResetEmail(event: H3Event | undefined, data: PasswordResetEmailData) {
  const dashboardBaseUrl = getDashboardBaseUrl(event)
  const template = renderPasswordResetEmail(data, dashboardBaseUrl)

  return sendEmailWithRetry(event, {
    to: data.toEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `password-reset/${data.userId}/${Math.floor(Date.now() / 60000)}`, // 1 minute granularity
    tags: [
      { name: 'category', value: 'password-reset' },
      { name: 'user_id', value: data.userId },
    ],
  })
}
