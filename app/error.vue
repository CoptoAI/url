<script setup lang="ts">
import type { NuxtError } from '#app'
import errorImage from './assets/images/404.svg?raw'

defineProps<{
  error: NuxtError
}>()
</script>

<template>
  <NuxtLayout name="default">
    <section
      class="
        flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16
        text-center
      "
    >
      <div
        class="
          flex w-full max-w-[480px] items-center justify-center rounded-2xl
          [&_svg]:h-auto [&_svg]:w-full
        "
        aria-hidden="true"
      >
        <span class="contents" v-html="errorImage" />
      </div>

      <div class="space-y-2">
        <h1 class="text-3xl font-bold tracking-tight">
          {{ error.statusCode === 404 ? $t('common.not_found') : `${error.statusCode} ${error.statusMessage || $t('common.error')}` }}
        </h1>
        <p class="mx-auto max-w-md text-sm text-muted-foreground">
          {{ error.statusCode === 404 ? $t('links.not_found') : (error.message || $t('common.error')) }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button as-child>
          <NuxtLink to="/dashboard">
            {{ $t('dashboard.title') }}
          </NuxtLink>
        </Button>
        <Button variant="outline" as-child>
          <NuxtLink to="/">
            {{ $t('layouts.links.home_aria_label') }}
          </NuxtLink>
        </Button>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  :deep(svg *) {
    animation: none !important;
  }
}
</style>
