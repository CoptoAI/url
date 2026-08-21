import { z } from 'zod'

export const OrganizationRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])
export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>

export const SubscriptionPlanSchema = z.enum(['free', 'starter', 'pro', 'enterprise'])
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>

export const CustomDomainStatusSchema = z.enum(['pending', 'active', 'error', 'deleting'])
export type CustomDomainStatus = z.infer<typeof CustomDomainStatusSchema>

export const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(64),
  slug: z.string().trim().min(2).max(48).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'),
  logo: z.string().trim().url().optional(),
})

export const UpdateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  logo: z.string().trim().url().nullable().optional(),
})

export const InviteMemberSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: OrganizationRoleSchema.default('member'),
})

export const UpdateMemberRoleSchema = z.object({
  role: OrganizationRoleSchema,
})

export const CreateCustomDomainSchema = z.object({
  domain: z.string().trim().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/, 'Invalid domain format'),
})

export const CreateApiKeySchema = z.object({
  name: z.string().trim().min(2).max(64),
  permissions: z.array(z.string()).default(['links:read', 'links:write']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(64),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export const PlanLimits = {
  free: {
    linksQuota: 100,
    clicksQuotaMonthly: 10000,
    customDomainsQuota: 0,
    teamSeatsQuota: 1,
    analyticsRetentionDays: 30,
    priceMonthly: 0,
  },
  starter: {
    linksQuota: 2500,
    clicksQuotaMonthly: 250000,
    customDomainsQuota: 2,
    teamSeatsQuota: 3,
    analyticsRetentionDays: 90,
    priceMonthly: 19,
  },
  pro: {
    linksQuota: 25000,
    clicksQuotaMonthly: 2500000,
    customDomainsQuota: 10,
    teamSeatsQuota: 10,
    analyticsRetentionDays: 365,
    priceMonthly: 49,
  },
  enterprise: {
    linksQuota: 1000000,
    clicksQuotaMonthly: 50000000,
    customDomainsQuota: 100,
    teamSeatsQuota: 100,
    analyticsRetentionDays: 730,
    priceMonthly: 199,
  },
} as const

export const WebhookEventSchema = z.enum([
  'link.created',
  'link.updated',
  'link.deleted',
  'domain.created',
  'domain.verified',
  'domain.deleted',
  'member.invited',
  'member.removed',
  'api_key.created',
  'api_key.revoked',
  'billing.upgraded',
])
export type WebhookEvent = z.infer<typeof WebhookEventSchema>

export const CreateWebhookSchema = z.object({
  url: z.string().trim().url('Must be a valid HTTP or HTTPS URL'),
  events: z.array(WebhookEventSchema).min(1, 'Select at least one event'),
  description: z.string().trim().max(128).optional(),
})

export const UpdateWebhookSchema = z.object({
  url: z.string().trim().url('Must be a valid HTTP or HTTPS URL').optional(),
  events: z.array(WebhookEventSchema).min(1).optional(),
  description: z.string().trim().max(128).optional(),
  isActive: z.boolean().optional(),
})

export const AuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
})
