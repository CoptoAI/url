import { describe, expect, it } from 'vitest'
import { fetch, postJson } from '../utils'

describe('workspace invitations', () => {
  it('creates an invite, fetches details, and accepts the invitation', async () => {
    const ownerEmail = `owner-${crypto.randomUUID()}@example.com`
    const invitedEmail = `invitee-${crypto.randomUUID()}@example.com`
    const password = 'StrongPassword123!'

    // 1. Register owner
    const regRes = await postJson('/api/auth/register', {
      email: ownerEmail,
      password,
      name: 'Owner User',
      organizationName: 'Owner Workspace',
    })
    expect(regRes.status).toBe(200)
    const { token: ownerToken, activeOrganization } = await regRes.json() as {
      token: string
      activeOrganization: { id: string, name: string }
    }

    // 2. Send Invite
    const inviteRes = await fetch(`/api/organizations/${activeOrganization.id}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: invitedEmail,
        role: 'member',
      }),
    })
    expect(inviteRes.status).toBe(200)
    const invite = await inviteRes.json() as { token: string }
    expect(invite.token).toMatch(/^inv_/)

    // 3. Fetch Invite Details (Public endpoint)
    const detailsRes = await fetch(`/api/auth/invite/details?token=${invite.token}`)
    expect(detailsRes.status).toBe(200)
    const details = await detailsRes.json() as { email: string, role: string, orgName: string }
    expect(details.email).toBe(invitedEmail)
    expect(details.role).toBe('member')
    expect(details.orgName).toBe(activeOrganization.name)

    // 4. Accept Invite as New User
    const acceptRes = await postJson('/api/auth/invite/accept', {
      token: invite.token,
      name: 'Invited Member',
      password: 'InviteePassword123!',
    })
    expect(acceptRes.status).toBe(200)
    const acceptData = await acceptRes.json() as {
      token: string
      user: { email: string, name: string }
      activeOrganization: { id: string }
    }
    expect(acceptData.token).toBeDefined()
    expect(acceptData.user.email).toBe(invitedEmail)
    expect(acceptData.activeOrganization.id).toBe(activeOrganization.id)

    // 5. Confirm member is listed in organization
    const membersRes = await fetch(`/api/organizations/${activeOrganization.id}/members`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(membersRes.status).toBe(200)
    const members = await membersRes.json() as Array<{ user: { email: string }, role: string }>
    expect(members.some(m => m.user.email === invitedEmail && m.role === 'member')).toBe(true)
  })
})
