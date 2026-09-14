<script setup lang="ts">
import type { VerifyResponse } from '@/types'
import { AlertCircle, CheckCircle2, Loader2 } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const { t } = useI18n()
const { userEmail, userName, authMethod, setAuthSession } = useAuthSession()

const submitError = shallowRef('')
const isSuccess = shallowRef(false)
const isSubmitting = shallowRef(false)

const form = useForm({
  defaultValues: {
    name: userName.value || '',
  },
  onSubmit: async ({ value }) => {
    if (isSubmitting.value)
      return

    submitError.value = ''
    isSuccess.value = false

    try {
      isSubmitting.value = true
      await useAPI('/api/auth/profile', {
        method: 'PATCH',
        body: { name: value.name.trim() },
      })
      isSuccess.value = true
      toast(t('profile.profile_updated'))
      const verifyRes = await useAPI<VerifyResponse>('/api/verify')
      setAuthSession(verifyRes)
    }
    catch (err: any) {
      submitError.value = err.data?.message || err.statusText || 'Failed to update name'
      toast.error(submitError.value)
    }
    finally {
      isSubmitting.value = false
    }
  },
})

watch(userName, (val) => {
  if (val && !form.state.values.name) {
    form.setFieldValue('name', val)
  }
})
</script>

<template>
  <form class="space-y-4" :aria-busy="isSubmitting" @submit.prevent="form.handleSubmit">
    <Alert v-if="submitError" variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" class="size-4" />
      <AlertTitle>{{ submitError }}</AlertTitle>
    </Alert>

    <Alert
      v-if="isSuccess"
      variant="default"
      class="border-primary/20 bg-primary/5 text-primary"
    >
      <CheckCircle2 aria-hidden="true" class="size-4" />
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

    <form.Field
      name="name"
      :validators="{
        onChange: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="profile-name">{{ $t('profile.name') }}</Label>
          <Input
            id="profile-name"
            type="text"
            placeholder="Your name"
            :model-value="field.state.value"
            :disabled="isSubmitting || authMethod === 'site-token'"
            @input="(e: any) => field.handleChange(e.target.value)"
          />
          <span
            v-if="field.state.meta.errors.length"
            class="text-xs text-destructive"
          >
            {{ field.state.meta.errors[0] }}
          </span>
        </div>
      </template>
    </form.Field>

    <div v-if="authMethod !== 'site-token'" class="flex justify-end pt-2">
      <Button
        type="submit"
        :disabled="isSubmitting || !form.state.values.name.trim()"
      >
        <Loader2 v-if="isSubmitting" class="mr-1.5 size-4 animate-spin" />
        {{ $t('profile.update_profile') }}
      </Button>
    </div>
  </form>
</template>
