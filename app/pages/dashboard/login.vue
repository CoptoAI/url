<script setup lang="ts">
const route = useRoute()
const initialTab = computed(() => {
  if (route.query.tab === 'register')
    return 'register'
  if (route.query.tab === 'token')
    return 'token'
  return 'login'
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div
    class="
      flex min-h-[calc(100vh-8rem)] flex-1 items-center justify-center px-4
      py-12
    "
  >
    <AuthCard :initial-tab="initialTab" />
  </div>
</template>
