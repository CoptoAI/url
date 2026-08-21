import { getUserOrganizations } from '../../saas/organizations/service'

export default eventHandler(async (event) => {
  const userId = event.context.userID
  if (!userId || userId === 'root') {
    return []
  }

  return await getUserOrganizations(event, userId)
})
