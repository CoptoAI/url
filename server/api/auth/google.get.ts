export default eventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const googleClientId = config.googleClientId as string

  if (!googleClientId) {
    setResponseStatus(event, 501)
    return {
      statusCode: 501,
      message: 'Google authentication is not configured on this server. Please set NUXT_GOOGLE_CLIENT_ID.',
    }
  }

  const url = getRequestURL(event)
  const forwardedHost = getHeader(event, 'x-forwarded-host')
  const forwardedProto = getHeader(event, 'x-forwarded-proto') || 'https'
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin
  const redirectUri = `${origin}/api/auth/google/callback`

  const state = crypto.randomUUID()
  setCookie(event, 'sink_oauth_state', state, {
    httpOnly: true,
    secure: origin.startsWith('https:'),
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleUrl.searchParams.set('client_id', googleClientId)
  googleUrl.searchParams.set('redirect_uri', redirectUri)
  googleUrl.searchParams.set('response_type', 'code')
  googleUrl.searchParams.set('scope', 'openid email profile')
  googleUrl.searchParams.set('state', state)
  googleUrl.searchParams.set('prompt', 'select_account')

  return sendRedirect(event, googleUrl.toString(), 302)
})
