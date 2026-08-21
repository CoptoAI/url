import { CreateOrganizationSchema } from '#shared/schemas/saas'
import { createOrganization } from '../../saas/organizations/service'

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    throw createError({
      status: 403,
      statusText: 'Admin root cannot create personal organizations directly',
    })
  }

  const body = await readValidatedBody(event, CreateOrganizationSchema.parse)
  const org = await createOrganization(event, userId, body)

  return org
})
