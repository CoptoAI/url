import type { Link } from '../../shared/schemas/link'
import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text().primaryKey(),
  email: text().notNull().unique(),
  name: text().notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  role: text({ enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  index('users_email_idx').on(table.email),
])

export const organizations = sqliteTable('organizations', {
  id: text().primaryKey(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  logo: text(),
  plan: text({ enum: ['free', 'starter', 'pro', 'enterprise'] }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status').default('active'),
  linksQuota: integer('links_quota').notNull().default(100),
  clicksQuotaMonthly: integer('clicks_quota_monthly').notNull().default(10000),
  customDomainsQuota: integer('custom_domains_quota').notNull().default(0),
  teamSeatsQuota: integer('team_seats_quota').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  index('organizations_slug_idx').on(table.slug),
  index('organizations_stripe_customer_idx').on(table.stripeCustomerId),
])

export const organizationMembers = sqliteTable('organization_members', {
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text({ enum: ['owner', 'admin', 'member', 'viewer'] }).notNull().default('member'),
  joinedAt: integer('joined_at').notNull(),
}, table => [
  primaryKey({ columns: [table.organizationId, table.userId] }),
  index('organization_members_user_idx').on(table.userId),
])

export const organizationInvites = sqliteTable('organization_invites', {
  id: text().primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text().notNull(),
  role: text({ enum: ['owner', 'admin', 'member', 'viewer'] }).notNull().default('member'),
  token: text().notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, table => [
  index('organization_invites_token_idx').on(table.token),
  index('organization_invites_org_idx').on(table.organizationId),
])

export const customDomains = sqliteTable('custom_domains', {
  id: text().primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  domain: text().notNull().unique(),
  cloudflareHostnameId: text('cloudflare_hostname_id'),
  status: text({ enum: ['pending', 'active', 'error', 'deleting'] }).notNull().default('pending'),
  sslStatus: text('ssl_status').default('initializing'),
  verificationDns: text('verification_dns', { mode: 'json' }).$type<{
    cnameTarget?: string
    txtRecordName?: string
    txtRecordValue?: string
  }>(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  index('custom_domains_org_idx').on(table.organizationId),
  index('custom_domains_domain_idx').on(table.domain),
])

export const apiKeys = sqliteTable('api_keys', {
  id: text().primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull(),
  permissions: text({ mode: 'json' }).$type<string[]>(),
  lastUsedAt: integer('last_used_at'),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull(),
}, table => [
  index('api_keys_org_idx').on(table.organizationId),
  index('api_keys_prefix_idx').on(table.keyPrefix),
])

export const links = sqliteTable('links', {
  slug: text().primaryKey(),
  id: text().notNull(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  customDomainId: text('custom_domain_id').references(() => customDomains.id, { onDelete: 'set null' }),
  url: text().notNull(),
  comment: text(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  expiration: integer(),
  title: text(),
  description: text(),
  image: text(),
  apple: text(),
  google: text(),
  cloaking: integer({ mode: 'boolean' }),
  redirectWithQuery: integer('redirect_with_query', { mode: 'boolean' }),
  password: text(),
  unsafe: integer({ mode: 'boolean' }),
  geo: text({ mode: 'json' }).$type<Link['geo']>(),
  normalizedUrl: text('normalized_url').notNull(),
  effectiveExpiresAt: integer('effective_expires_at'),
}, table => [
  index('links_created_at_slug_idx').on(table.createdAt, table.slug),
  index('links_created_at_desc_slug_idx').on(sql`${table.createdAt} desc`, table.slug),
  index('links_normalized_url_idx').on(table.normalizedUrl),
  index('links_id_idx').on(table.id),
  index('links_org_created_at_idx').on(table.organizationId, table.createdAt),
  index('links_domain_slug_idx').on(table.customDomainId, table.slug),
])

export const tags = sqliteTable('tags', {
  name: text().primaryKey(),
})

export const linkTags = sqliteTable('link_tags', {
  linkSlug: text('link_slug').notNull().references(() => links.slug, { onDelete: 'cascade' }),
  tagName: text('tag_name').notNull().references(() => tags.name, { onDelete: 'cascade' }),
}, table => [
  primaryKey({ columns: [table.linkSlug, table.tagName] }),
  index('link_tags_tag_name_link_slug_idx').on(table.tagName, table.linkSlug),
])

export const linkTombstones = sqliteTable('link_tombstones', {
  slug: text().primaryKey(),
  deletedAt: integer('deleted_at').notNull(),
})

export const linkMigrationRuns = sqliteTable('link_migration_runs', {
  id: text().primaryKey(),
  expectedCursor: text('expected_cursor'),
  scanned: integer().notNull().default(0),
  inserted: integer().notNull().default(0),
  skipped: integer().notNull().default(0),
  expired: integer().notNull().default(0),
  force: integer({ mode: 'boolean' }).notNull(),
  status: text({ enum: ['running', 'completed'] }).notNull().default('running'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  index('link_migration_runs_status_updated_at_desc_created_at_desc_id_desc_idx').on(
    table.status,
    sql`${table.updatedAt} desc`,
    sql`${table.createdAt} desc`,
    sql`${table.id} desc`,
  ),
])

export const auditLogs = sqliteTable('audit_logs', {
  id: text().primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull(),
  actorType: text('actor_type', { enum: ['user', 'api_key', 'system'] }).notNull().default('user'),
  actorEmail: text('actor_email'),
  action: text().notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  details: text({ mode: 'json' }).$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull(),
}, table => [
  index('audit_logs_org_created_idx').on(table.organizationId, sql`${table.createdAt} desc`),
  index('audit_logs_action_idx').on(table.organizationId, table.action),
  index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
])

export const webhooks = sqliteTable('webhooks', {
  id: text().primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  url: text().notNull(),
  secret: text().notNull(),
  events: text({ mode: 'json' }).$type<string[]>().notNull(),
  description: text(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  index('webhooks_org_idx').on(table.organizationId),
  index('webhooks_active_idx').on(table.organizationId, table.isActive),
])

export const webhookDeliveries = sqliteTable('webhook_deliveries', {
  id: text().primaryKey(),
  webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  event: text().notNull(),
  payload: text({ mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  durationMs: integer('duration_ms'),
  isSuccess: integer('is_success', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
}, table => [
  index('webhook_deliveries_webhook_created_idx').on(table.webhookId, sql`${table.createdAt} desc`),
  index('webhook_deliveries_org_created_idx').on(table.organizationId, sql`${table.createdAt} desc`),
])
