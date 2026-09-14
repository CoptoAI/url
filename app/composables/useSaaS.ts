import type { CustomDomain, Organization, OrganizationInvite, OrganizationMember } from '#shared/types/saas'
import { readonly, useState } from '#imports'
import { getActiveOrganizationId, setActiveOrganizationId, setAuthToken } from '@/utils/auth-token'

export function useSaaS() {
  const organizations = useState<Organization[]>('saas-organizations', () => [])
  const activeOrganization = useState<Organization | null>('saas-active-org', () => null)
  const members = useState<OrganizationMember[]>('saas-members', () => [])
  const invites = useState<OrganizationInvite[]>('saas-invites', () => [])
  const customDomains = useState<CustomDomain[]>('saas-custom-domains', () => [])
  const isLoading = useState('saas-loading', () => false)

  async function fetchOrganizations() {
    try {
      isLoading.value = true
      const orgs = await useAPI<Organization[]>('/api/organizations')
      organizations.value = orgs
      const savedOrgId = getActiveOrganizationId()
      const matched = orgs.find(o => o.id === savedOrgId) || orgs[0] || null
      activeOrganization.value = matched
      if (matched) {
        setActiveOrganizationId(matched.id)
      }
    }
    catch (err) {
      console.error('Failed to fetch organizations:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  async function switchOrganization(org: Organization) {
    try {
      isLoading.value = true
      activeOrganization.value = org
      setActiveOrganizationId(org.id)
      const res = await useAPI<{ token: string, organization: Organization }>('/api/auth/switch-organization', {
        method: 'POST',
        body: { organizationId: org.id },
      })
      if (res?.token) {
        setAuthToken(res.token)
      }
    }
    catch (err) {
      console.error('Failed to switch organization token:', err)
    }
    finally {
      if (import.meta.client) {
        window.location.reload()
      }
    }
  }

  async function fetchMembers(orgId?: string) {
    const targetOrgId = orgId || activeOrganization.value?.id
    if (!targetOrgId)
      return []
    try {
      const data = await useAPI<OrganizationMember[]>(`/api/organizations/${targetOrgId}/members`)
      members.value = data
      return data
    }
    catch (err) {
      console.error('Failed to fetch members:', err)
      return []
    }
  }

  async function fetchInvites(orgId?: string) {
    const targetOrgId = orgId || activeOrganization.value?.id
    if (!targetOrgId)
      return []
    try {
      const data = await useAPI<OrganizationInvite[]>(`/api/organizations/${targetOrgId}/invites`)
      invites.value = data
      return data
    }
    catch (err) {
      console.error('Failed to fetch invites:', err)
      return []
    }
  }

  async function fetchCustomDomains(orgId?: string) {
    const targetOrgId = orgId || activeOrganization.value?.id
    if (!targetOrgId)
      return []
    try {
      const data = await useAPI<CustomDomain[]>(`/api/organizations/${targetOrgId}/domains`)
      customDomains.value = data
      return data
    }
    catch (err) {
      console.error('Failed to fetch custom domains:', err)
      return []
    }
  }

  return {
    organizations: readonly(organizations),
    activeOrganization: readonly(activeOrganization),
    members: readonly(members),
    invites: readonly(invites),
    customDomains: readonly(customDomains),
    isLoading: readonly(isLoading),
    fetchOrganizations,
    switchOrganization,
    fetchMembers,
    fetchInvites,
    fetchCustomDomains,
  }
}
