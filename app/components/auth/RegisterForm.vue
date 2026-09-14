<script setup lang="ts">
import { AlertCircle, Loader2 } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { z } from 'zod'

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const submitError = shallowRef('')
const isSubmitting = shallowRef(false)

const form = useForm({
  defaultValues: {
    name: '',
    email: '',
    password: '',
    workspaceName: '',
  },
  onSubmit: async ({ value }) => {
    if (isSubmitting.value)
      return

    submitError.value = ''
    try {
      isSubmitting.value = true
      const response = await $fetch<{
        token: string
        user: { id: string, email: string, name: string, onboardingCompleted?: boolean }
        activeOrganization?: { id: string, name: string, slug: string }
      }>('/api/auth/register', {
        method: 'POST',
        body: {
          name: value.name,
          email: value.email,
          password: value.password,
          ...(value.workspaceName?.trim() ? { organizationName: value.workspaceName.trim() } : {}),
        },
      })

      if (response.token) {
        setAuthToken(response.token)
        if (response.activeOrganization?.id) {
          setActiveOrganizationId(response.activeOrganization.id)
        }
        await useAPI('/api/verify')
        emit('success')
        if (response.user.onboardingCompleted) {
          await navigateTo('/dashboard')
        }
        else {
          await navigateTo('/onboarding')
        }
      }
    }
    catch (err: any) {
      console.error(err)
      submitError.value = err.data?.message || err.statusText || t('register.failed')
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
      name="name"
      :validators="{
        onChange: z.string().trim().min(2, 'Name must be at least 2 characters').max(64),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="reg-name">{{ $t('register.name_label') }}</Label>
          <Input
            id="reg-name"
            type="text"
            autocomplete="name"
            placeholder="Jane Developer"
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
      name="email"
      :validators="{
        onChange: z.string().trim().email('Please enter a valid email address'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="reg-email">{{ $t('register.email_label') }}</Label>
          <Input
            id="reg-email"
            type="email"
            autocomplete="email"
            placeholder="jane@company.com"
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
          <Label for="reg-password">{{ $t('register.password_label') }}</Label>
          <Input
            id="reg-password"
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

    <form.Field name="workspaceName">
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="reg-workspace">{{ $t('register.workspace_label') }} (Optional)</Label>
          <Input
            id="reg-workspace"
            type="text"
            placeholder="Acme Shorteners"
            :model-value="field.state.value"
            :disabled="isSubmitting"
            @input="(e: any) => field.handleChange(e.target.value)"
          />
        </div>
      </template>
    </form.Field>

    <Button class="w-full" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
      <Loader2
        v-if="isSubmitting" aria-hidden="true" class="motion-safe:animate-spin"
      />
      {{ $t(isSubmitting ? 'register.creating' : 'register.submit') }}
    </Button>
  </form>
</template>
