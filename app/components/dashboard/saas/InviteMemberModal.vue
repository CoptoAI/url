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
    title="Invite Team Member"
    description="Add a new member to your workspace with specific access permissions."
  >
    <div class="p-4">
      <DashboardSaasInviteMemberForm @success="handleSuccess" />
    </div>
  </ResponsiveModal>
</template>
