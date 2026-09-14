<script setup lang="ts">
import { AlertCircle, Building2, Loader2 } from '@lucide/vue'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const token = computed(() => String(route.query.token || ''))

interface InviteData {
  id: string
  email: string
  role: string
  expiresAt: number
  orgName: string
  orgSlug: string
  inviterName: string
}

const inviteData = shallowRef<InviteData | null>(null)
const isLoading = shallowRef(true)
const fetchError = shallowRef('')

async function fetchInvite() {
  if (!token.value) {
    isLoading.value = false
    fetchError.value = 'Invalid invitation link'
    return
  }

  isLoading.value = true
  fetchError.value = ''
  try {
    const data = await $fetch<InviteData>('/api/auth/invite/details', {
      query: { token: token.value },
    })
    inviteData.value = data
  }
  catch (err: any) {
    console.error(err)
    fetchError.value = err.data?.message || err.statusText || 'Invitation link is invalid or expired'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchInvite()
})
</script>

<template>
  <div
    class="
      flex min-h-[calc(100vh-8rem)] flex-1 items-center justify-center px-4
      py-12
    "
  >
    <Card class="w-full max-w-md shadow-lg">
      <CardHeader class="space-y-1.5 pb-4 text-center">
        <div
          class="
            mx-auto mb-1 flex size-10 items-center justify-center rounded-xl
            bg-primary text-primary-foreground shadow-sm
          "
        >
          <Building2 class="size-5" />
        </div>
        <CardTitle class="text-2xl font-bold tracking-tight">
          Workspace Invitation
        </CardTitle>
        <CardDescription v-if="inviteData">
          {{ inviteData.inviterName }} invited you to join <strong
            class="text-foreground"
          >{{ inviteData.orgName }}</strong>.
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <div
          v-if="isLoading" class="
            flex flex-col items-center justify-center gap-3 py-8
            text-muted-foreground
          "
        >
          <Loader2
            class="
              size-6 text-primary
              motion-safe:animate-spin
            "
          />
          <p class="text-xs">
            Loading invitation details...
          </p>
        </div>

        <Alert v-else-if="fetchError" variant="destructive">
          <AlertCircle class="size-4" />
          <AlertTitle>{{ fetchError }}</AlertTitle>
          <AlertDescription class="mt-2">
            <Button variant="link" size="sm" class="h-auto p-0 text-destructive" as-child>
              <NuxtLink to="/auth/login">
                Return to login
              </NuxtLink>
            </Button>
          </AlertDescription>
        </Alert>

        <AuthInviteAcceptForm
          v-else-if="inviteData"
          :token="token"
          :email="inviteData.email"
          :org-name="inviteData.orgName"
          :role="inviteData.role"
        />
      </CardContent>
    </Card>
  </div>
</template>
