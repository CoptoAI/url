import { describe, expect, it } from 'vitest'
import { fetch } from '../utils'

describe('google oauth authentication endpoints', () => {
  it('initiates google oauth with redirect and state cookie', async () => {
    const res = await fetch('/api/auth/google', {
      redirect: 'manual',
    })

    // If NUXT_GOOGLE_CLIENT_ID is not configured in test environment, it returns 501
    // or if configured, returns 302 redirect to accounts.google.com
    if (res.status === 501) {
      expect(res.status).toBe(501)
      const err = await res.json() as { message?: string, statusMessage?: string }
      const msg = err.statusMessage || err.message || ''
      expect(msg).toContain('Google authentication is not configured')
    }
    else {
      expect(res.status).toBe(302)
      const location = res.headers.get('location')
      expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(location).toContain('client_id=')
      expect(location).toContain('redirect_uri=')
      expect(location).toContain('state=')

      const cookie = res.headers.get('set-cookie')
      expect(cookie).toContain('sink_oauth_state=')
    }
  })

  it('rejects google callback with invalid or missing state', async () => {
    const res = await fetch('/api/auth/google/callback?code=mock_code&state=invalid_state', {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toContain('/dashboard/login?error=Invalid+OAuth+state')
  })

  it('handles user cancellation error from google gracefully', async () => {
    const res = await fetch('/api/auth/google/callback?error=access_denied&error_description=User+cancelled', {
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toContain('/dashboard/login?error=')
    expect(decodeURIComponent(location || '')).toContain('User cancelled')
  })
})
