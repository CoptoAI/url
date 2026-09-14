import type { VerifyResponse } from '../../shared/types/auth'
import { describe, expect, it } from 'vitest'
import { fetch, postJson } from '../utils'

describe('enterprise multi-tenant auth & onboarding flow', () => {
  it('checks username availability correctly', async () => {
    // 1. Reserved username
    const resReserved = await fetch('/api/auth/check-username?username=admin')
    expect(resReserved.status).toBe(200)
    const dataReserved = await resReserved.json() as { available: boolean, reason?: string }
    expect(dataReserved.available).toBe(false)
    expect(dataReserved.reason).toContain('reserved')

    // 2. Invalid username format (too short or invalid chars)
    const resInvalid = await fetch('/api/auth/check-username?username=a!')
    expect(resInvalid.status).toBe(200)
    const dataInvalid = await resInvalid.json() as { available: boolean, reason?: string }
    expect(dataInvalid.available).toBe(false)

    // 3. Available username
    const uniqueName = `user_${crypto.randomUUID().slice(0, 8)}`
    const resValid = await fetch(`/api/auth/check-username?username=${uniqueName}`)
    expect(resValid.status).toBe(200)
    const dataValid = await resValid.json() as { available: boolean }
    expect(dataValid.available).toBe(true)
  })

  it('checks workspace slug availability correctly', async () => {
    // 1. Reserved slug
    const resReserved = await fetch('/api/organizations/check-slug?slug=dashboard')
    expect(resReserved.status).toBe(200)
    const dataReserved = await resReserved.json() as { available: boolean, reason?: string }
    expect(dataReserved.available).toBe(false)

    // 2. Available slug
    const uniqueSlug = `ws-${crypto.randomUUID().slice(0, 8)}`
    const resValid = await fetch(`/api/organizations/check-slug?slug=${uniqueSlug}`)
    expect(resValid.status).toBe(200)
    const dataValid = await resValid.json() as { available: boolean }
    expect(dataValid.available).toBe(true)
  })

  it('handles complete onboarding flow with workspace creation and team invites', async () => {
    const testEmail = `founder-${crypto.randomUUID()}@acme-test.corp`
    const password = 'EnterprisePassword123!'

    // 1. Register new user without workspace
    const regRes = await postJson('/api/auth/register', {
      email: testEmail,
      name: 'Acme Founder',
      password,
    })
    expect(regRes.status).toBe(200)
    const regData = await regRes.json() as {
      token: string
      user: { id: string, onboardingCompleted: boolean }
      activeOrganization: unknown
    }
    expect(regData.token).toBeDefined()
    expect(regData.user.onboardingCompleted).toBe(false)
    expect(regData.activeOrganization).toBeNull()

    const token = regData.token

    // 2. Verify state before onboarding
    const verifyBefore = await fetch('/api/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(verifyBefore.status).toBe(200)
    const verifyDataBefore = await verifyBefore.json() as VerifyResponse
    expect(verifyDataBefore.onboardingCompleted).toBe(false)

    // 3. Complete onboarding
    const chosenUsername = `acme_founder_${crypto.randomUUID().slice(0, 6)}`
    const chosenWorkspaceSlug = `acme-corp-${crypto.randomUUID().slice(0, 6)}`
    const teammateEmail = `colleague-${crypto.randomUUID()}@acme-test.corp`

    const completeRes = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: chosenUsername,
        name: 'Acme Founder Updated',
        action: 'create_workspace',
        workspaceName: 'Acme Corporation',
        workspaceSlug: chosenWorkspaceSlug,
        teamSize: 'medium',
        invites: [
          { email: teammateEmail, role: 'admin' },
        ],
      }),
    })
    expect(completeRes.status).toBe(200)
    const completeData = await completeRes.json() as {
      token: string
      user: { id: string, username: string, onboardingCompleted: boolean }
      organization: { id: string, name: string, slug: string }
    }

    expect(completeData.user.onboardingCompleted).toBe(true)
    expect(completeData.user.username).toBe(chosenUsername)
    expect(completeData.organization.name).toBe('Acme Corporation')
    expect(completeData.organization.slug).toBe(chosenWorkspaceSlug)

    const newToken = completeData.token

    // 4. Verify session after onboarding
    const verifyAfter = await fetch('/api/verify', {
      headers: { Authorization: `Bearer ${newToken}` },
    })
    expect(verifyAfter.status).toBe(200)
    const verifyDataAfter = await verifyAfter.json() as VerifyResponse
    expect(verifyDataAfter.onboardingCompleted).toBe(true)
    expect(verifyDataAfter.username).toBe(chosenUsername)
    expect(verifyDataAfter.organizationId).toBe(completeData.organization.id)

    // 5. Username is now taken
    const resTaken = await fetch(`/api/auth/check-username?username=${chosenUsername}`)
    const dataTaken = await resTaken.json() as { available: boolean }
    expect(dataTaken.available).toBe(false)

    // 6. Workspace slug is now taken
    const resSlugTaken = await fetch(`/api/organizations/check-slug?slug=${chosenWorkspaceSlug}`)
    const dataSlugTaken = await resSlugTaken.json() as { available: boolean }
    expect(dataSlugTaken.available).toBe(false)
  })

  it('handles corporate domain discovery and joining existing enterprise workspace', async () => {
    const domain = `domain-${crypto.randomUUID().slice(0, 8)}.io`
    const ownerEmail = `owner@${domain}`
    const employeeEmail = `employee@${domain}`

    // 1. Owner registers with workspace upfront
    const ownerReg = await postJson('/api/auth/register', {
      email: ownerEmail,
      name: 'Org Owner',
      password: 'OwnerPassword123!',
      organizationName: 'Auto Join Corp',
    })
    expect(ownerReg.status).toBe(200)
    const ownerData = await ownerReg.json() as {
      token: string
      activeOrganization: { id: string }
    }
    const orgId = ownerData.activeOrganization.id

    // Enable allowedDomains on the organization
    const updateOrgRes = await fetch(`/api/organizations/${orgId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ownerData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allowedDomains: [domain],
      }),
    })
    expect(updateOrgRes.status).toBe(200)

    // 2. Employee registers with email from the same domain
    const empReg = await postJson('/api/auth/register', {
      email: employeeEmail,
      name: 'Employee Test',
      password: 'EmployeePassword123!',
    })
    expect(empReg.status).toBe(200)
    const empData = await empReg.json() as { token: string }

    // 3. Employee calls domain discovery
    const discoverRes = await fetch('/api/onboarding/discover-domain', {
      headers: { Authorization: `Bearer ${empData.token}` },
    })
    expect(discoverRes.status).toBe(200)
    const discoverData = await discoverRes.json() as {
      found: boolean
      domain?: string
      organization?: { id: string, name: string }
    }
    expect(discoverData.found).toBe(true)
    expect(discoverData.domain).toBe(domain)
    expect(discoverData.organization?.id).toBe(orgId)
    expect(discoverData.organization?.name).toBe('Auto Join Corp')

    // 4. Employee completes onboarding by joining the discovered workspace
    const empUsername = `emp_${crypto.randomUUID().slice(0, 8)}`
    const joinRes = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${empData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: empUsername,
        action: 'join_workspace',
        joinOrganizationId: orgId,
      }),
    })
    expect(joinRes.status).toBe(200)
    const joinData = await joinRes.json() as {
      token: string
      user: { onboardingCompleted: boolean }
      organization: { id: string, name: string }
    }
    expect(joinData.user.onboardingCompleted).toBe(true)
    expect(joinData.organization.id).toBe(orgId)

    // 5. Verify employee is a member of the organization
    const membersRes = await fetch(`/api/organizations/${orgId}/members`, {
      headers: { Authorization: `Bearer ${ownerData.token}` },
    })
    expect(membersRes.status).toBe(200)
    const members = await membersRes.json() as Array<{ user: { email: string }, role: string }>
    const foundEmp = members.find(m => m.user.email === employeeEmail)
    expect(foundEmp).toBeDefined()
    expect(foundEmp?.role).toBe('member')
  })
})
