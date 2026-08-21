<script setup lang="ts">
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
    title="Connect Custom Domain"
    description="Brand your links with your own custom domain or subdomain."
  >
    <div class="p-4">
      <DashboardSaasAddDomainForm @success="handleSuccess" />
    </div>
  </ResponsiveModal>
</template>
