defineRouteMeta({
  openAPI: {
    description: 'Verify the current authentication method',
    responses: {
      200: {
        description: 'The authentication credentials are valid',
      },
      default: {
        description: 'The authentication credentials are invalid',
      },
    },
  },
})

export default eventHandler((event) => {
  const authMethod: unknown = event.context.authMethod
  const userID: unknown = event.context.userID
  const userEmail: unknown = event.context.userEmail || (authMethod === 'api-key' ? `api-key@${event.context.organizationId}` : undefined)
  const userName: unknown = event.context.userName
  const username: unknown = event.context.username
  const organizationId: unknown = event.context.organizationId
  const onboardingCompleted: boolean = authMethod === 'session-jwt'
    ? Boolean(event.context.onboardingCompleted)
    : true

  if (
    (
      authMethod !== 'site-token'
      && authMethod !== 'access-user'
      && authMethod !== 'access-service'
      && authMethod !== 'session-jwt'
      && authMethod !== 'api-key'
    )
    || typeof userID !== 'string'
    || !userID
  ) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
    })
  }

  const { cfAccessTeamDomain, cfAccessAud } = useRuntimeConfig(event)

  return {
    name: 'Sink',
    url: 'https://sink.cool',
    authMethod,
    userID,
    userEmail: typeof userEmail === 'string' ? userEmail : undefined,
    userName: typeof userName === 'string' ? userName : undefined,
    username: typeof username === 'string' ? username : undefined,
    organizationId: typeof organizationId === 'string' ? organizationId : undefined,
    onboardingCompleted,
    accessEnabled: isCloudflareAccessConfigured(cfAccessTeamDomain, cfAccessAud),
  }
})
