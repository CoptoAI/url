<script setup lang="ts">
import { KeyRound, ShieldCheck, User } from '@lucide/vue'

definePageMeta({
  layout: 'dashboard',
})

const { userID, authMethod, organizationId } = useAuthSession()
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
        <CardContent>
          <DashboardSaasProfileGeneralForm />
        </CardContent>
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
