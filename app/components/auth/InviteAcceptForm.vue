<script setup lang="ts">
import { AlertCircle, CheckCircle2, Loader2 } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { z } from 'zod'

const props = defineProps<{
  token: string
  email: string
  orgName: string
  role: string
}>()

const { userID } = useAuthSession()
const isSubmitting = shallowRef(false)
const submitError = shallowRef('')

const form = useForm({
  defaultValues: {
    name: '',
    password: '',
  },
  onSubmit: async ({ value }) => {
    if (isSubmitting.value)
      return

    submitError.value = ''
    try {
      isSubmitting.value = true
      const response = await $fetch<{
        token: string
        user: { id: string, email: string, name: string }
        activeOrganization: { id: string, name: string, slug: string }
      }>('/api/auth/invite/accept', {
        method: 'POST',
        body: {
          token: props.token,
          name: value.name || undefined,
          password: value.password || undefined,
        },
      })

      if (response.token) {
        setAuthToken(response.token)
        if (response.activeOrganization?.id) {
          setActiveOrganizationId(response.activeOrganization.id)
        }
        await useAPI('/api/verify')
        await navigateTo('/dashboard')
      }
    }
    catch (err: any) {
      console.error(err)
      submitError.value = err.data?.message || err.statusText || 'Failed to accept invitation'
    }
    finally {
      isSubmitting.value = false
    }
  },
})
</script>

<template>
  <form class="space-y-4" :aria-busy="isSubmitting" @submit.prevent="form.handleSubmit">
    <Alert v-if="submitError" variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" class="size-4" />
      <AlertTitle>{{ submitError }}</AlertTitle>
    </Alert>

    <div class="rounded-lg border bg-muted/50 p-4 text-center">
      <p class="text-sm font-medium text-foreground">
        {{ orgName }}
      </p>
      <div class="mt-1 flex items-center justify-center gap-2">
        <Badge variant="secondary" class="capitalize">
          {{ role }}
        </Badge>
        <span class="text-xs text-muted-foreground">{{ email }}</span>
      </div>
    </div>

    <!-- If user is logged in, they can simply accept without entering name/password -->
    <template v-if="!userID">
      <form.Field
        name="name"
        :validators="{
          onChange: z.string().trim().min(2, 'Name must be at least 2 characters'),
        }"
      >
        <template #default="{ field }">
          <div class="space-y-1.5">
            <Label for="invite-name">{{ $t('profile.name') }}</Label>
            <Input
              id="invite-name"
              type="text"
              placeholder="Your name"
              required
              :model-value="field.state.value"
              :disabled="isSubmitting"
              @input="(e: any) => field.handleChange(e.target.value)"
            />
            <span
              v-if="field.state.meta.errors.length" class="
                text-xs text-destructive
              "
            >
              {{ field.state.meta.errors[0] }}
            </span>
          </div>
        </template>
      </form.Field>

      <form.Field
        name="password"
        :validators="{
          onChange: z.string().min(8, 'Password must be at least 8 characters'),
        }"
      >
        <template #default="{ field }">
          <div class="space-y-1.5">
            <Label for="invite-password">{{ $t('login.password_label') }}</Label>
            <Input
              id="invite-password"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              required
              :model-value="field.state.value"
              :disabled="isSubmitting"
              @input="(e: any) => field.handleChange(e.target.value)"
            />
            <span
              v-if="field.state.meta.errors.length" class="
                text-xs text-destructive
              "
            >
              {{ field.state.meta.errors[0] }}
            </span>
          </div>
        </template>
      </form.Field>
    </template>

    <Button class="w-full" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
      <Loader2
        v-if="isSubmitting" aria-hidden="true" class="motion-safe:animate-spin"
      />
      <CheckCircle2 v-else aria-hidden="true" class="mr-1.5 size-4" />
      {{ userID ? 'Accept & Join Workspace' : 'Create Account & Join' }}
    </Button>
  </form>
</template>
