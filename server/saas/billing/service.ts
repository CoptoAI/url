import type { H3Event } from 'h3'
import type { SubscriptionPlan } from '#shared/schemas/saas'
import { count, eq } from 'drizzle-orm'
import { PlanLimits } from '#shared/schemas/saas'
import { customDomains, links, organizationMembers, organizations } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

export async function checkOrganizationQuota(event: H3Event, orgId: string) {
  const db = getD1Database(event)
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  if (!org) {
    throw createError({ status: 404, statusText: 'Organization not found' })
  }

  const [linksCount] = await db.select({ count: count() }).from(links).where(eq(links.organizationId, orgId))
  const [domainsCount] = await db.select({ count: count() }).from(customDomains).where(eq(customDomains.organizationId, orgId))
  const [membersCount] = await db.select({ count: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, orgId))

  const plan = (org.plan || 'free') as SubscriptionPlan
  const limits = PlanLimits[plan] || PlanLimits.free

  return {
    organizationId: org.id,
    plan,
    usage: {
      links: linksCount?.count ?? 0,
      domains: domainsCount?.count ?? 0,
      members: membersCount?.count ?? 0,
    },
    limits: {
      linksQuota: org.linksQuota || limits.linksQuota,
      customDomainsQuota: org.customDomainsQuota || limits.customDomainsQuota,
      teamSeatsQuota: org.teamSeatsQuota || limits.teamSeatsQuota,
      clicksQuotaMonthly: org.clicksQuotaMonthly || limits.clicksQuotaMonthly,
      analyticsRetentionDays: limits.analyticsRetentionDays,
    },
  }
}

export async function assertOrganizationQuota(event: H3Event, orgId: string, resource: 'links' | 'domains' | 'members') {
  const quota = await checkOrganizationQuota(event, orgId)

  if (resource === 'links' && quota.usage.links >= quota.limits.linksQuota) {
    throw createError({
      status: 403,
      statusText: `Link creation quota reached (${quota.limits.linksQuota}). Upgrade your plan to create more links.`,
    })
  }

  if (resource === 'domains' && quota.usage.domains >= quota.limits.customDomainsQuota) {
    throw createError({
      status: 403,
      statusText: `Custom domain quota reached (${quota.limits.customDomainsQuota}). Upgrade your plan to add more domains.`,
    })
  }

  if (resource === 'members' && quota.usage.members >= quota.limits.teamSeatsQuota) {
    throw createError({
      status: 403,
      statusText: `Team seat quota reached (${quota.limits.teamSeatsQuota}). Upgrade your plan to invite more members.`,
    })
  }
}

export async function updateOrganizationPlan(
  event: H3Event,
  orgId: string,
  plan: SubscriptionPlan,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
) {
  const db = getD1Database(event)
  const limits = PlanLimits[plan] || PlanLimits.free
  const now = Math.floor(Date.now() / 1000)

  const [updated] = await db.update(organizations).set({
    plan,
    linksQuota: limits.linksQuota,
    clicksQuotaMonthly: limits.clicksQuotaMonthly,
    customDomainsQuota: limits.customDomainsQuota,
    teamSeatsQuota: limits.teamSeatsQuota,
    stripeCustomerId: stripeCustomerId || undefined,
    stripeSubscriptionId: stripeSubscriptionId || undefined,
    subscriptionStatus: 'active',
    updatedAt: now,
  }).where(eq(organizations.id, orgId)).returning()

  try {
    const { dispatchWebhookEvent } = await import('../webhooks')
    await dispatchWebhookEvent(event, {
      organizationId: orgId,
      eventName: 'billing.upgraded',
      payload: { plan, status: 'active', updatedAt: now },
    })
  }
  catch {
    // Non-blocking
  }

  return updated
}
