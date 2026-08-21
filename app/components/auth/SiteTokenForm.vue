<script setup lang="ts">
import { AlertCircle, Loader2 } from '@lucide/vue'
import { z } from 'zod'

const { t } = useI18n()
const { previewMode } = useRuntimeConfig().public

const token = shallowRef('')
const error = shallowRef('')
const submitError = shallowRef('')
const isSubmitting = shallowRef(false)

const LoginSchema = z.object({
  token: z.string().min(1),
})

watch(token, () => {
  error.value = ''
  submitError.value = ''
})

async function handleSubmit() {
  if (isSubmitting.value)
    return

  error.value = ''
  submitError.value = ''
  const result = LoginSchema.safeParse({ token: token.value })

  if (!result.success) {
    error.value = t('login.token_required')
    await nextTick()
    document.getElementById('site-token')?.focus()
    return
  }

  try {
    isSubmitting.value = true
    setAuthToken(token.value)
    await useAPI('/api/verify')
    await navigateTo('/dashboard')
  }
  catch (e) {
    removeAuthToken()
    console.error(e)
    submitError.value = t('login.failed')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form class="space-y-4" :aria-busy="isSubmitting" @submit.prevent="handleSubmit">
    <Alert v-if="submitError" variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" class="size-4" />
      <AlertTitle>{{ submitError }}</AlertTitle>
    </Alert>

    <div class="space-y-1.5">
      <Label for="site-token">{{ $t('login.token_label') }}</Label>
      <Input
        id="site-token"
        v-model="token"
        type="password"
        autocomplete="current-password"
        placeholder="********"
        required
        :aria-invalid="!!error"
        :disabled="isSubmitting"
      />
      <span v-if="error" class="text-xs text-destructive">
        {{ error }}
      </span>
    </div>

    <Alert v-if="previewMode">
      <AlertCircle aria-hidden="true" class="size-4" />
      <AlertTitle>{{ $t('login.tips') }}</AlertTitle>
      <AlertDescription>
        {{ $t('login.preview_token') }}
        <code
          class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground"
        >SinkCool</code>
      </AlertDescription>
    </Alert>

    <Button class="w-full" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
      <Loader2
        v-if="isSubmitting" aria-hidden="true" class="motion-safe:animate-spin"
      />
      {{ $t(isSubmitting ? 'login.logging_in' : 'login.submit') }}
    </Button>
  </form>
</template>
