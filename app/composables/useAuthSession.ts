import type { AuthMethod, VerifyResponse } from '@/types'
import { readonly, useState } from '#imports'

export function useAuthSession() {
  const authMethod = useState<AuthMethod | null>('auth-method', () => null)
  const userID = useState<string | null>('user-id', () => null)
  const userEmail = useState<string | null>('user-email', () => null)
  const userName = useState<string | null>('user-name', () => null)
  const organizationId = useState<string | null>('user-organization-id', () => null)
  const accessEnabled = useState('access-enabled', () => false)

  function setAuthSession(response: VerifyResponse) {
    authMethod.value = response.authMethod
    userID.value = response.userID
    userEmail.value = response.userEmail || null
    userName.value = response.userName || null
    organizationId.value = response.organizationId || null
    accessEnabled.value = response.accessEnabled
  }

  function clearAuthSession() {
    authMethod.value = null
    userID.value = null
    userEmail.value = null
    userName.value = null
    organizationId.value = null
    accessEnabled.value = false
  }

  return {
    authMethod: readonly(authMethod),
    userID: readonly(userID),
    userEmail: readonly(userEmail),
    userName: readonly(userName),
    organizationId: readonly(organizationId),
    accessEnabled: readonly(accessEnabled),
    setAuthSession,
    clearAuthSession,
  }
}
