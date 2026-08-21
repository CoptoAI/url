<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

function handleSuccess() {
  open.value = false
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    title="Create New Workspace"
    description="Set up a multi-tenant workspace to organize your links, custom domains, and team members."
  >
    <div class="p-4">
      <DashboardSaasWorkspaceCreateForm @success="handleSuccess" />
    </div>
  </ResponsiveModal>
</template>
