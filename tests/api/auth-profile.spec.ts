import type { VerifyResponse } from '../../shared/types/auth'
import { describe, expect, it } from 'vitest'
import { fetch, postJson } from '../utils'

describe('saas profile & password management', () => {
  it('updates profile and changes password successfully', async () => {
    const testEmail = `profile-test-${crypto.randomUUID()}@example.com`
    const initialPassword = 'InitialPassword123!'
    const newPassword = 'NewSecurePassword456!'

    // 1. Register
    const regRes = await postJson('/api/auth/register', {
      email: testEmail,
      password: initialPassword,
      name: 'Initial Name',
      organizationName: 'Profile Test Org',
    })
    expect(regRes.status).toBe(200)
    const regData = await regRes.json() as { token: string, user: { id: string } }
    const token = regData.token
    expect(token).toBeDefined()

    // 2. Verify session
    const verifyRes = await fetch('/api/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(verifyRes.status).toBe(200)
    const verifyData = await verifyRes.json() as VerifyResponse
    expect(verifyData.authMethod).toBe('session-jwt')
    expect(verifyData.userEmail).toBe(testEmail)
    expect(verifyData.userName).toBe('Initial Name')

    // 3. Update Profile Name
    const updateRes = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    })
    expect(updateRes.status).toBe(200)
    const updateData = await updateRes.json() as { name: string }
    expect(updateData.name).toBe('Updated Name')

    // 4. Change Password - Incorrect current password fails
    const failPassRes = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword!',
        newPassword,
      }),
    })
    expect(failPassRes.status).toBe(400)

    // 5. Change Password - Short new password fails validation
    const shortPassRes = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: 'short',
      }),
    })
    expect(shortPassRes.status).toBe(400)

    // 6. Change Password - Valid request succeeds
    const successPassRes = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword,
      }),
    })
    expect(successPassRes.status).toBe(200)

    // 7. Login with old password fails
    const oldLoginRes = await postJson('/api/auth/login', {
      email: testEmail,
      password: initialPassword,
    })
    expect(oldLoginRes.status).toBe(401)

    // 8. Login with new password succeeds
    const newLoginRes = await postJson('/api/auth/login', {
      email: testEmail,
      password: newPassword,
    })
    expect(newLoginRes.status).toBe(200)
    const newLoginData = await newLoginRes.json() as { token: string }
    expect(newLoginData.token).toBeDefined()
  })
})
