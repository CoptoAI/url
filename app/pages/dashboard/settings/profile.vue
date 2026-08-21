<script setup lang="ts">
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck, User } from '@lucide/vue'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const { userID, userEmail, userName, authMethod, organizationId } = useAuthSession()

const name = shallowRef('')
const isSavingName = shallowRef(false)
const nameSaved = shallowRef(false)
const nameError = shallowRef('')

watch(userName, (val) => {
  if (val)
    name.value = val
}, { immediate: true })

async function handleUpdateName() {
  if (!name.value.trim() || isSavingName.value)
    return

  nameError.value = ''
  nameSaved.value = false
  try {
    isSavingName.value = true
    await useAPI('/api/auth/profile', {
      method: 'PATCH',
      body: { name: name.value.trim() },
    })
    nameSaved.value = true
    toast(t('profile.profile_updated'))
    // Refresh session
    await useAPI('/api/verify')
  }
  catch (err: any) {
    nameError.value = err.data?.message || 'Failed to update name'
    toast.error(nameError.value)
  }
  finally {
    isSavingName.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        {{ $t('profile.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ $t('profile.description') }}
      </p>
    </div>

    <div
      class="
        grid gap-6
        md:grid-cols-2
      "
    >
      <!-- General Information -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <User class="size-4 text-primary" />
            <CardTitle class="text-base">
              {{ $t('profile.general') }}
            </CardTitle>
          </div>
          <CardDescription>
            Update your public display name and account details.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Alert v-if="nameError" variant="destructive">
            <AlertCircle class="size-4" />
            <AlertTitle>{{ nameError }}</AlertTitle>
          </Alert>

          <Alert
            v-if="nameSaved" class="border-primary/20 bg-primary/5 text-primary"
          >
            <CheckCircle2 class="size-4" />
            <AlertTitle>{{ $t('profile.profile_updated') }}</AlertTitle>
          </Alert>

          <div class="space-y-1.5">
            <Label for="profile-email">{{ $t('profile.email') }}</Label>
            <Input
              id="profile-email"
              type="email"
              :model-value="userEmail || ''"
              disabled
              class="bg-muted text-muted-foreground"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="profile-name">{{ $t('profile.name') }}</Label>
            <Input
              id="profile-name"
              v-model="name"
              type="text"
              placeholder="Your name"
              :disabled="isSavingName || authMethod === 'site-token'"
            />
          </div>
        </CardContent>
        <CardFooter
          v-if="authMethod !== 'site-token'" class="
            flex justify-end border-t pt-4
          "
        >
          <Button :disabled="isSavingName || !name.trim()" @click="handleUpdateName">
            <Loader2 v-if="isSavingName" class="motion-safe:animate-spin" />
            {{ $t('profile.update_profile') }}
          </Button>
        </CardFooter>
      </Card>

      <!-- Security & Password -->
      <Card v-if="authMethod === 'session-jwt'">
        <CardHeader>
          <div class="flex items-center gap-2">
            <KeyRound class="size-4 text-primary" />
            <CardTitle class="text-base">
              {{ $t('profile.security') }}
            </CardTitle>
          </div>
          <CardDescription>
            Change your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardSaasProfilePasswordForm />
        </CardContent>
      </Card>

      <!-- Session Information -->
      <Card
        :class="authMethod !== 'session-jwt' ? 'md:col-span-1' : `md:col-span-2`"
      >
        <CardHeader>
          <div class="flex items-center gap-2">
            <ShieldCheck class="size-4 text-primary" />
            <CardTitle class="text-base">
              {{ $t('profile.session_info') }}
            </CardTitle>
          </div>
          <CardDescription>
            Details about your current session and active authentication method.
          </CardDescription>
        </CardHeader>
        <CardContent
          class="
            grid gap-3
            sm:grid-cols-3
          "
        >
          <div class="rounded-lg border p-3">
            <div class="text-xs text-muted-foreground">
              {{ $t('profile.auth_method') }}
            </div>
            <div class="mt-1 font-mono text-sm font-semibold capitalize">
              {{ authMethod || 'unknown' }}
            </div>
          </div>
          <div class="rounded-lg border p-3">
            <div class="text-xs text-muted-foreground">
              {{ $t('profile.user_id') }}
            </div>
            <div class="mt-1 truncate font-mono text-sm font-semibold">
              {{ userID || 'N/A' }}
            </div>
          </div>
          <div class="rounded-lg border p-3">
            <div class="text-xs text-muted-foreground">
              {{ $t('profile.org_id') }}
            </div>
            <div class="mt-1 truncate font-mono text-sm font-semibold">
              {{ organizationId || 'Personal' }}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
