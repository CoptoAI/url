const TOKEN_KEY = 'SinkSiteToken'
const ORG_KEY = 'SinkActiveOrgId'

export function getAuthToken() {
  if (!import.meta.client)
    return null

  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  if (!import.meta.client)
    return

  localStorage.setItem(TOKEN_KEY, token)
}

export function removeAuthToken() {
  if (!import.meta.client)
    return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ORG_KEY)
}

export function getActiveOrganizationId() {
  if (!import.meta.client)
    return null

  return localStorage.getItem(ORG_KEY)
}

export function setActiveOrganizationId(orgId: string) {
  if (!import.meta.client)
    return

  localStorage.setItem(ORG_KEY, orgId)
}

export function removeActiveOrganizationId() {
  if (!import.meta.client)
    return

  localStorage.removeItem(ORG_KEY)
}
