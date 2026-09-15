import { describe, expect, it, vi } from 'vitest'
import { sendEmailWithRetry } from '../../server/saas/email/client'
import { escapeHtml, renderBaseEmailLayout } from '../../server/saas/email/templates/base'
import { renderWorkspaceInviteEmail } from '../../server/saas/email/templates/invitation'
import { renderPasswordResetEmail } from '../../server/saas/email/templates/password-reset'
import { renderVerificationEmail } from '../../server/saas/email/templates/verification'

describe('email Templates', () => {
  it('escapes HTML characters properly', () => {
    expect(escapeHtml('<script>alert("xss & \'test\'")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss &amp; &#039;test&#039;&quot;)&lt;/script&gt;',
    )
  })

  it('renders base layout with title and preheader', () => {
    const html = renderBaseEmailLayout({
      title: 'Welcome to Shaf',
      preheader: 'Important account information',
      contentHtml: '<p>Hello World</p>',
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Welcome to Shaf')
    expect(html).toContain('Important account information')
    expect(html).toContain('<p>Hello World</p>')
    expect(html).toContain('Shaf')
  })

  it('renders workspace invitation template with token link and role', () => {
    const email = renderWorkspaceInviteEmail(
      {
        inviteId: 'inv_123',
        toEmail: 'colleague@example.com',
        inviterName: 'Alice',
        inviterEmail: 'alice@example.com',
        organizationName: 'Acme Corp',
        role: 'member',
        inviteToken: 'tok_abc123',
        expiresAt: 1700000000,
      },
      'https://dash.shaf.app',
    )

    expect(email.subject).toBe('Join Acme Corp on Shaf')
    expect(email.html).toContain('https://dash.shaf.app/invites/tok_abc123')
    expect(email.html).toContain('Alice')
    expect(email.html).toContain('Acme Corp')
    expect(email.text).toContain('https://dash.shaf.app/invites/tok_abc123')
  })

  it('renders email verification template', () => {
    const email = renderVerificationEmail(
      {
        userId: 'usr_123',
        toEmail: 'newuser@example.com',
        userName: 'Bob',
        verificationToken: 'verify_token_999',
      },
      'https://dash.shaf.app',
    )

    expect(email.subject).toBe('Verify your email address for Shaf')
    expect(email.html).toContain('Bob')
    expect(email.html).toContain('verify_token_999')
    expect(email.text).toContain('https://dash.shaf.app/verify-email?token=verify_token_999')
  })

  it('renders password reset template', () => {
    const email = renderPasswordResetEmail(
      {
        userId: 'usr_123',
        toEmail: 'reset@example.com',
        resetToken: 'reset_token_456',
      },
      'https://dash.shaf.app',
    )

    expect(email.subject).toBe('Reset your Shaf password')
    expect(email.html).toContain('reset_token_456')
    expect(email.html).toContain('This link will expire in 1 hour')
    expect(email.text).toContain('https://dash.shaf.app/reset-password?token=reset_token_456')
  })
})

describe('email Client Mock Mode', () => {
  it('falls back to mock mode when resend API key is not set', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      resendApiKey: '',
      resendFromEmail: 'Shaf <notifications@shaf.app>',
    }))

    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await sendEmailWithRetry(undefined, {
      to: 'delivered@resend.dev',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      idempotencyKey: 'test/123',
    })

    expect(result.success).toBe(true)
    expect(result.mock).toBe(true)
    expect(result.id).toMatch(/^mock_/)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('delivered@resend.dev'))

    consoleSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
