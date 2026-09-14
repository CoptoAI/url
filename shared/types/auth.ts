export type AuthMethod = 'site-token' | 'access-user' | 'access-service' | 'api-key' | 'session-jwt'

export interface VerifyResponse {
  name: string
  url: string
  authMethod: AuthMethod
  userID: string
  userEmail?: string
  userName?: string
  username?: string
  avatarUrl?: string
  organizationId?: string
  onboardingCompleted?: boolean
  accessEnabled: boolean
}
