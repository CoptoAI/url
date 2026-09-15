export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string | string[]
  idempotencyKey?: string
  tags?: { name: string, value: string }[]
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
  mock?: boolean
}

export interface WorkspaceInviteEmailData {
  inviteId: string
  toEmail: string
  inviterName: string
  inviterEmail: string
  organizationName: string
  role: string
  inviteToken: string
  expiresAt: number
}

export interface VerificationEmailData {
  userId: string
  toEmail: string
  userName?: string
  verificationToken: string
}

export interface PasswordResetEmailData {
  userId: string
  toEmail: string
  userName?: string
  resetToken: string
}
