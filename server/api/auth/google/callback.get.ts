import { and, eq } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'
import { oauthAccounts, users } from '../../../database/schema'
import { createSessionToken } from '../../../saas/auth/jwt'
import { getUserOrganizations } from '../../../saas/organizations/service'
import { getD1Database } from '../../../services/link-store/d1'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

interface GoogleTokenResponse {
  access_token: string
  id_token?: string
  expires_in: number
  token_type: string
  scope: string
}

interface GoogleUserInfo {
  sub: string
  email: string
  name: string
  picture?: string
  email_verified?: boolean
}

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)
  const googleClientId = config.googleClientId as string
  const googleClientSecret = config.googleClientSecret as string

  // Check for OAuth errors from Google
  if (query.error) {
    const errorMsg = encodeURIComponent(String(query.error_description || query.error))
    return sendRedirect(event, `/dashboard/login?error=${errorMsg}`, 302)
  }

  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const storedState = getCookie(event, 'sink_oauth_state')

  // Validate state
  if (!state || !storedState || state !== storedState) {
    deleteCookie(event, 'sink_oauth_state', { path: '/' })
    return sendRedirect(event, `/dashboard/login?error=Invalid+OAuth+state`, 302)
  }
  deleteCookie(event, 'sink_oauth_state', { path: '/' })

  if (!code) {
    return sendRedirect(event, `/dashboard/login?error=Missing+authorization+code`, 302)
  }

  const url = getRequestURL(event)
  const forwardedHost = getHeader(event, 'x-forwarded-host')
  const forwardedProto = getHeader(event, 'x-forwarded-proto') || 'https'
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin
  const redirectUri = `${origin}/api/auth/google/callback`

  try {
    // 1. Exchange code for tokens
    const tokenRes = await $fetch<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })

    // 2. Fetch User Profile
    const userInfo = await $fetch<GoogleUserInfo>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenRes.access_token}`,
      },
    })

    if (!userInfo || !userInfo.email) {
      return sendRedirect(event, `/dashboard/login?error=Failed+to+retrieve+Google+profile`, 302)
    }

    const db = getD1Database(event)
    const now = Math.floor(Date.now() / 1000)

    // 3. Resolve User: By googleId OR oauth_accounts OR email
    let user: typeof users.$inferSelect | undefined

    // Check by googleId
    const [byGoogleId] = await db.select().from(users).where(eq(users.googleId, userInfo.sub)).limit(1)
    if (byGoogleId) {
      user = byGoogleId
    }
    else {
      // Check oauth_accounts
      const [byOauth] = await db.select()
        .from(oauthAccounts)
        .where(and(eq(oauthAccounts.provider, 'google'), eq(oauthAccounts.providerAccountId, userInfo.sub)))
        .limit(1)

      if (byOauth) {
        const [matchedUser] = await db.select().from(users).where(eq(users.id, byOauth.userId)).limit(1)
        user = matchedUser
      }
    }

    // Check by email
    if (!user) {
      const [byEmail] = await db.select().from(users).where(eq(users.email, userInfo.email.toLowerCase())).limit(1)
      if (byEmail) {
        user = byEmail
        // Link Google ID and update avatar/verification
        await db.update(users)
          .set({
            googleId: userInfo.sub,
            avatarUrl: user.avatarUrl || userInfo.picture || null,
            emailVerified: true,
            updatedAt: now,
          })
          .where(eq(users.id, user.id))

        await db.insert(oauthAccounts).values({
          id: `oa_${nanoid()}`,
          userId: user.id,
          provider: 'google',
          providerAccountId: userInfo.sub,
          profile: userInfo as any,
          createdAt: now,
        }).onConflictDoNothing()
      }
    }

    // Create new user if not exists
    if (!user) {
      const newUserId = `usr_${nanoid()}`
      const [created] = await db.insert(users).values({
        id: newUserId,
        email: userInfo.email.toLowerCase(),
        name: userInfo.name || 'User',
        avatarUrl: userInfo.picture || null,
        googleId: userInfo.sub,
        emailVerified: true,
        onboardingCompleted: false,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      }).returning()

      user = created

      await db.insert(oauthAccounts).values({
        id: `oa_${nanoid()}`,
        userId: user!.id,
        provider: 'google',
        providerAccountId: userInfo.sub,
        profile: userInfo as any,
        createdAt: now,
      })
    }

    const userOrgs = await getUserOrganizations(event, user!.id)
    const primaryOrg = userOrgs[0]

    // 4. Issue session token
    const token = await createSessionToken(event, {
      userId: user!.id,
      email: user!.email,
      name: user!.name,
      username: user!.username || undefined,
      organizationId: primaryOrg?.id,
      role: primaryOrg?.role,
      onboardingCompleted: user!.onboardingCompleted,
    })

    const needsOnboarding = !user!.onboardingCompleted
    return sendRedirect(event, `/auth/callback?token=${encodeURIComponent(token)}&onboarding=${needsOnboarding}`, 302)
  }
  catch (err: any) {
    console.error('Google OAuth callback error:', err)
    const msg = encodeURIComponent(err.message || 'Authentication failed')
    return sendRedirect(event, `/dashboard/login?error=${msg}`, 302)
  }
})
