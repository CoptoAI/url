import type { CustomDomain, Organization, OrganizationMember } from '#shared/types/saas'
import { readonly, useState } from '#imports'
import { getActiveOrganizationId, setActiveOrganizationId } from '@/utils/auth-token'

export function useSaaS() {
  const organizations = useState<Organization[]>('saas-organizations', () => [])
  const activeOrganization = useState<Organization | null>('saas-active-org', () => null)
  const members = useState<OrganizationMember[]>('saas-members', () => [])
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

  function switchOrganization(org: Organization) {
    activeOrganization.value = org
    setActiveOrganizationId(org.id)
    // Reload dashboard state for new organization scope
    if (import.meta.client) {
      window.location.reload()
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
    customDomains: readonly(customDomains),
    isLoading: readonly(isLoading),
    fetchOrganizations,
    switchOrganization,
    fetchMembers,
    fetchCustomDomains,
  }
}
