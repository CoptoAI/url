<script setup lang="ts">
import { AlertCircle, CheckCircle2, Loader2 } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const { t } = useI18n()
const submitError = shallowRef('')
const isSuccess = shallowRef(false)
const isSubmitting = shallowRef(false)

const form = useForm({
  defaultValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  },
  onSubmit: async ({ value }) => {
    if (isSubmitting.value)
      return

    submitError.value = ''
    isSuccess.value = false

    if (value.newPassword !== value.confirmPassword) {
      submitError.value = t('profile.password_mismatch')
      return
    }

    try {
      isSubmitting.value = true
      await useAPI('/api/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        },
      })
      isSuccess.value = true
      toast(t('profile.password_updated'))
      form.reset()
    }
    catch (err: any) {
      console.error(err)
      submitError.value = err.data?.message || err.statusText || 'Failed to update password'
      toast.error(submitError.value)
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

    <Alert
      v-if="isSuccess" variant="default" class="
        border-primary/20 bg-primary/5 text-primary
      "
    >
      <CheckCircle2 aria-hidden="true" class="size-4" />
      <AlertTitle>{{ $t('profile.password_updated') }}</AlertTitle>
    </Alert>

    <form.Field
      name="currentPassword"
      :validators="{
        onChange: z.string().min(1, 'Current password is required'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="current-password">{{ $t('profile.current_password') }}</Label>
          <Input
            id="current-password"
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

    <form.Field
      name="newPassword"
      :validators="{
        onChange: z.string().min(8, 'New password must be at least 8 characters'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="new-password">{{ $t('profile.new_password') }}</Label>
          <Input
            id="new-password"
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

    <form.Field
      name="confirmPassword"
      :validators="{
        onChange: z.string().min(8, 'Please confirm your new password'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="confirm-password">{{ $t('profile.confirm_password') }}</Label>
          <Input
            id="confirm-password"
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

    <div class="flex justify-end pt-2">
      <Button type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
        <Loader2
          v-if="isSubmitting" aria-hidden="true" class="
            motion-safe:animate-spin
          "
        />
        {{ $t('profile.update_password') }}
      </Button>
    </div>
  </form>
</template>
