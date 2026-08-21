import { eq } from 'drizzle-orm'
import { UpdateProfileSchema } from '#shared/schemas/saas'
import { users } from '../../database/schema'
import { getD1Database } from '../../services/link-store/d1'

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    throw createError({
      status: 400,
      statusText: 'Profile updates are only supported for registered SaaS accounts',
    })
  }

  const body = await readValidatedBody(event, UpdateProfileSchema.parse)
  const db = getD1Database(event)

  const now = Math.floor(Date.now() / 1000)

  const [updatedUser] = await db.update(users)
    .set({
      name: body.name,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning()

  if (!updatedUser) {
    throw createError({
      status: 404,
      statusText: 'User not found',
    })
  }

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
  }
})
