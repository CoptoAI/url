import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { organizations } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

const QuerySchema = z.object({
  slug: z.string().trim().toLowerCase(),
})

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'dashboard',
  'settings',
  'support',
  'billing',
  'system',
  'root',
  'sink',
  'app',
])

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const slug = query.slug

  if (slug.length < 2 || slug.length > 48 || !/^[a-z0-9-]+$/.test(slug)) {
    return {
      available: false,
      reason: 'Slug must be 2-48 lowercase alphanumeric characters and hyphens',
    }
  }

  if (RESERVED_SLUGS.has(slug)) {
    return {
      available: false,
      reason: 'This workspace slug is reserved',
    }
  }

  const db = getD1Database(event)
  const [existing] = await db.select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (existing) {
    return {
      available: false,
      reason: 'This workspace slug is already taken',
    }
  }

  return {
    available: true,
  }
})
