<script setup lang="ts">
import { AlertCircle, Loader2 } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { z } from 'zod'

const emit = defineEmits<{
  openForgot: []
}>()

const { t } = useI18n()
const submitError = shallowRef('')
const isSubmitting = shallowRef(false)

const form = useForm({
  defaultValues: {
    email: '',
    password: '',
    rememberMe: false,
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
      }>('/api/auth/login', {
        method: 'POST',
        body: {
          email: value.email,
          password: value.password,
        },
      })

      if (response.token) {
        setAuthToken(response.token)
        if (response.activeOrganization?.id) {
          localStorage.setItem('sink_saas_org_id', response.activeOrganization.id)
        }
        await useAPI('/api/verify')
        await navigateTo('/dashboard')
      }
    }
    catch (err: any) {
      console.error(err)
      submitError.value = err.data?.message || err.statusText || t('login.failed')
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

    <form.Field
      name="email"
      :validators="{
        onChange: z.string().trim().email('Please enter a valid email address'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="login-email">{{ $t('login.email_label') }}</Label>
          <Input
            id="login-email"
            type="email"
            autocomplete="email"
            placeholder="name@company.com"
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
        onChange: z.string().min(1, 'Password is required'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <Label for="login-password">{{ $t('login.password_label') }}</Label>
            <button
              type="button"
              class="
                text-xs text-muted-foreground transition-colors
                hover:text-foreground
              "
              @click="emit('openForgot')"
            >
              {{ $t('login.forgot_password') }}
            </button>
          </div>
          <Input
            id="login-password"
            type="password"
            autocomplete="current-password"
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

    <Button class="w-full" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
      <Loader2
        v-if="isSubmitting" aria-hidden="true" class="motion-safe:animate-spin"
      />
      {{ $t(isSubmitting ? 'login.logging_in' : 'login.submit') }}
    </Button>
  </form>
</template>
