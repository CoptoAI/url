import type { VerifyResponse } from '@/types'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (!to.path.startsWith('/dashboard') && to.path !== '/onboarding')
    return

  const { setAuthSession, clearAuthSession } = useAuthSession()

  try {
    const response = await useAPI<VerifyResponse>('/api/verify')
    setAuthSession(response)

    // If onboarding is incomplete, redirect from dashboard to /onboarding
    if (!response.onboardingCompleted && response.authMethod === 'session-jwt') {
      if (to.path !== '/onboarding') {
        return navigateTo('/onboarding')
      }
      return
    }

    // If onboarding is complete, redirect from /onboarding or /dashboard/login to dashboard
    if (to.path === '/onboarding' || to.path === '/dashboard/login') {
      return navigateTo('/dashboard')
    }
  }
  catch {
    clearAuthSession()
    if (to.path === '/onboarding') {
      return navigateTo('/dashboard/login')
    }
    if (to.path !== '/dashboard/login') {
      return abortNavigation()
    }
  }
})
