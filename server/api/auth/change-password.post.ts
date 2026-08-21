import { eq } from 'drizzle-orm'
import { ChangePasswordSchema } from '#shared/schemas/saas'
import { users } from '../../database/schema'
import { hashPassword, verifyPassword } from '../../saas/auth/password'
import { getD1Database } from '../../services/link-store/d1'

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    throw createError({
      status: 400,
      statusText: 'Password changes are only supported for registered SaaS accounts',
    })
  }

  const body = await readValidatedBody(event, ChangePasswordSchema.parse)
  const db = getD1Database(event)

  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user || !user.passwordHash) {
    throw createError({
      status: 400,
      statusText: 'User does not have a local password configured or user not found',
    })
  }

  const isCurrentValid = await verifyPassword(body.currentPassword, user.passwordHash)
  if (!isCurrentValid) {
    throw createError({
      status: 400,
      statusText: 'Incorrect current password',
    })
  }

  const newHash = await hashPassword(body.newPassword)
  const now = Math.floor(Date.now() / 1000)

  await db.update(users)
    .set({
      passwordHash: newHash,
      updatedAt: now,
    })
    .where(eq(users.id, userId))

  return { success: true }
})
