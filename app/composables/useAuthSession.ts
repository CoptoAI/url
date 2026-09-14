import type { AuthMethod, VerifyResponse } from '@/types'
import { readonly, useState } from '#imports'

export function useAuthSession() {
  const authMethod = useState<AuthMethod | null>('auth-method', () => null)
  const userID = useState<string | null>('user-id', () => null)
  const userEmail = useState<string | null>('user-email', () => null)
  const userName = useState<string | null>('user-name', () => null)
  const username = useState<string | null>('user-username', () => null)
  const avatarUrl = useState<string | null>('user-avatar-url', () => null)
  const organizationId = useState<string | null>('user-organization-id', () => null)
  const onboardingCompleted = useState<boolean>('user-onboarding-completed', () => true)
  const accessEnabled = useState('access-enabled', () => false)

  function setAuthSession(response: VerifyResponse) {
    authMethod.value = response.authMethod
    userID.value = response.userID
    userEmail.value = response.userEmail || null
    userName.value = response.userName || null
    username.value = response.username || null
    avatarUrl.value = response.avatarUrl || null
    organizationId.value = response.organizationId || null
    onboardingCompleted.value = response.onboardingCompleted ?? true
    accessEnabled.value = response.accessEnabled
  }

  function clearAuthSession() {
    authMethod.value = null
    userID.value = null
    userEmail.value = null
    userName.value = null
    username.value = null
    avatarUrl.value = null
    organizationId.value = null
    onboardingCompleted.value = true
    accessEnabled.value = false
  }

  return {
    authMethod: readonly(authMethod),
    userID: readonly(userID),
    userEmail: readonly(userEmail),
    userName: readonly(userName),
    username: readonly(username),
    avatarUrl: readonly(avatarUrl),
    organizationId: readonly(organizationId),
    onboardingCompleted: readonly(onboardingCompleted),
    accessEnabled: readonly(accessEnabled),
    setAuthSession,
    clearAuthSession,
  }
}
