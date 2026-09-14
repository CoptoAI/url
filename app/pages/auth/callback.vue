<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { setAuthToken } from '@/utils/auth-token'

definePageMeta({
  layout: 'default',
})

const route = useRoute()

onMounted(async () => {
  const token = route.query.token as string | undefined
  const needsOnboarding = route.query.onboarding === 'true'

  if (token) {
    setAuthToken(token)
    try {
      const { setAuthSession } = useAuthSession()
      const verifyData = await useAPI<any>('/api/verify')
      setAuthSession(verifyData)

      if (verifyData.organizationId) {
        setActiveOrganizationId(verifyData.organizationId)
      }

      if (needsOnboarding || !verifyData.onboardingCompleted) {
        await navigateTo('/onboarding')
      }
      else {
        await navigateTo('/dashboard')
      }
    }
    catch (err) {
      console.error('Failed to initialize session after OAuth:', err)
      await navigateTo('/dashboard/login')
    }
  }
  else {
    await navigateTo('/dashboard/login')
  }
})
</script>

<template>
  <div
    class="
      flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4
      text-center
    "
  >
    <div
      class="
        flex size-12 items-center justify-center rounded-2xl bg-primary/10
        text-primary
      "
    >
      <Loader2
        class="
          size-6
          motion-safe:animate-spin
        "
      />
    </div>
    <div class="space-y-1">
      <h3 class="text-lg font-semibold tracking-tight">
        Authenticating...
      </h3>
      <p class="text-xs text-muted-foreground">
        Securely connecting your account. You will be redirected shortly.
      </p>
    </div>
  </div>
</template>
