import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { UsernameSchema } from '#shared/schemas/saas'
import { users } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

const QuerySchema = z.object({
  username: z.string().trim().toLowerCase(),
})

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'sink',
  'api',
  'auth',
  'dashboard',
  'settings',
  'help',
  'support',
  'billing',
  'workspace',
  'workspaces',
  'login',
  'register',
  'signup',
  'onboarding',
  'invite',
  'docs',
  'public',
  'system',
])

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const username = query.username

  const parseResult = UsernameSchema.safeParse(username)
  if (!parseResult.success) {
    return {
      available: false,
      reason: parseResult.error.issues[0]?.message || 'Invalid username format',
    }
  }

  if (RESERVED_USERNAMES.has(username)) {
    return {
      available: false,
      reason: 'This username is reserved',
    }
  }

  const db = getD1Database(event)
  const [existing] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (existing) {
    return {
      available: false,
      reason: 'This username is already taken',
    }
  }

  return {
    available: true,
  }
})
