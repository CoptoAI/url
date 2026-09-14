import type { CustomDomainStatus, OrganizationRole, SubscriptionPlan } from '../schemas/saas'

export interface User {
  id: string
  email: string
  name: string
  username?: string | null
  avatarUrl?: string | null
  emailVerified: boolean
  onboardingCompleted: boolean
  role: 'user' | 'admin'
  createdAt: number
  updatedAt: number
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  plan: SubscriptionPlan
  allowedDomains?: readonly string[] | string[] | null
  subscriptionStatus?: string | null
  linksQuota: number
  clicksQuotaMonthly: number
  customDomainsQuota: number
  teamSeatsQuota: number
  role?: OrganizationRole
  createdAt: number
  updatedAt: number
}

export interface OrganizationMember {
  organizationId: string
  userId: string
  role: OrganizationRole
  user: {
    id: string
    email: string
    name: string
    avatarUrl?: string | null
  }
  joinedAt: number
}

export interface OrganizationInvite {
  id: string
  organizationId: string
  email: string
  role: OrganizationRole
  token: string
  expiresAt: number
  createdAt: number
}

export interface CustomDomain {
  id: string
  organizationId: string
  domain: string
  cloudflareHostnameId?: string | null
  status: CustomDomainStatus
  sslStatus?: string | null
  verificationDns?: {
    cnameTarget?: string
    txtRecordName?: string
    txtRecordValue?: string
  } | null
  rootRedirectUrl?: string | null
  notFoundRedirectUrl?: string | null
  createdAt: number
  updatedAt: number
}

export interface ApiKeyItem {
  id: string
  organizationId: string
  name: string
  keyPrefix: string
  permissions: string[]
  lastUsedAt?: number | null
  expiresAt?: number | null
  createdAt: number
}

export interface ApiKeyCreatedResult extends ApiKeyItem {
  secretKey: string
}
