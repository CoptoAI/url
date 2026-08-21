<script setup lang="ts">
import { AlertCircle, CheckCircle2, Loader2 } from '@lucide/vue'

const open = defineModel<boolean>('open', { default: false })
const email = shallowRef('')
const isSubmitting = shallowRef(false)
const isSuccess = shallowRef(false)
const error = shallowRef('')

function handleClose() {
  open.value = false
  isSuccess.value = false
  email.value = ''
  error.value = ''
}

async function handleSubmit() {
  if (!email.value || isSubmitting.value)
    return

  isSubmitting.value = true
  error.value = ''
  try {
    // Simulate/send password recovery endpoint request
    await new Promise(resolve => setTimeout(resolve, 800))
    isSuccess.value = true
  }
  catch (err: any) {
    error.value = err.data?.message || 'Failed to request password reset'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="$t('forgot_password.title')"
    :description="$t('forgot_password.description')"
  >
    <div class="p-4">
      <div v-if="isSuccess" class="space-y-4 text-center">
        <div
          class="
            mx-auto flex size-12 items-center justify-center rounded-full
            bg-primary/10 text-primary
          "
        >
          <CheckCircle2 class="size-6" />
        </div>
        <div class="space-y-1">
          <h3 class="font-medium text-foreground">
            {{ $t('forgot_password.success_title') }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ $t('forgot_password.success_description') }}
          </p>
        </div>
        <Button class="w-full" @click="handleClose">
          {{ $t('forgot_password.close') }}
        </Button>
      </div>

      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <Alert v-if="error" variant="destructive">
          <AlertCircle class="size-4" />
          <AlertTitle>{{ error }}</AlertTitle>
        </Alert>

        <div class="space-y-1.5">
          <Label for="forgot-email">{{ $t('forgot_password.email_label') }}</Label>
          <Input
            id="forgot-email"
            v-model="email"
            type="email"
            placeholder="name@company.com"
            required
            :disabled="isSubmitting"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" :disabled="isSubmitting" @click="handleClose">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting || !email">
            <Loader2 v-if="isSubmitting" class="motion-safe:animate-spin" />
            {{ $t(isSubmitting ? 'forgot_password.sending' : 'forgot_password.submit') }}
          </Button>
        </div>
      </form>
    </div>
  </ResponsiveModal>
</template>
