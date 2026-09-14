<script setup lang="ts">
import type { CustomDomain } from '#shared/types/saas'

defineProps<{
  domain: CustomDomain | null
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>('open', { default: false })

function handleSuccess() {
  open.value = false
  emit('success')
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    title="Domain Settings"
    description="Configure default redirect rules for your custom domain."
  >
    <div v-if="domain" class="p-4">
      <DashboardSaasConfigureDomainForm
        :domain="domain"
        @success="handleSuccess"
      />
    </div>
  </ResponsiveModal>
</template>
