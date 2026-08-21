<script setup lang="ts">
import { ArrowRight, Globe, Link2, Sparkles, UserPlus } from '@lucide/vue'

const open = shallowRef(false)
const currentStep = shallowRef(1)

onMounted(() => {
  if (typeof window !== 'undefined' && localStorage.getItem('sink_show_onboarding') === 'true') {
    open.value = true
  }
})

function handleComplete() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sink_show_onboarding')
  }
  open.value = false
}

function handleGoTo(path: string) {
  handleComplete()
  navigateTo(path)
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    :title="$t('onboarding.welcome_title')"
    :description="$t('onboarding.welcome_description')"
  >
    <div class="space-y-6 p-4">
      <div class="grid gap-3">
        <!-- Step 1 -->
        <div
          class="
            flex items-start gap-3 rounded-lg border p-3 transition-colors
            hover:border-primary/50
          "
          :class="currentStep === 1 ? 'border-primary bg-primary/5' : 'bg-card'"
        >
          <div
            class="
              flex size-8 shrink-0 items-center justify-center rounded-md
              bg-primary/10 text-primary
            "
          >
            <Link2 class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-foreground">
              {{ $t('onboarding.step1_title') }}
            </h4>
            <p class="text-xs text-muted-foreground">
              {{ $t('onboarding.step1_description') }}
            </p>
          </div>
          <Button size="sm" variant="ghost" class="shrink-0" @click="handleGoTo('/dashboard/links')">
            <ArrowRight class="size-3.5" />
          </Button>
        </div>

        <!-- Step 2 -->
        <div
          class="
            flex items-start gap-3 rounded-lg border p-3 transition-colors
            hover:border-primary/50
          "
          :class="currentStep === 2 ? 'border-primary bg-primary/5' : 'bg-card'"
        >
          <div
            class="
              flex size-8 shrink-0 items-center justify-center rounded-md
              bg-primary/10 text-primary
            "
          >
            <Globe class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-foreground">
              {{ $t('onboarding.step2_title') }}
            </h4>
            <p class="text-xs text-muted-foreground">
              {{ $t('onboarding.step2_description') }}
            </p>
          </div>
          <Button size="sm" variant="ghost" class="shrink-0" @click="handleGoTo('/dashboard/settings/domains')">
            <ArrowRight class="size-3.5" />
          </Button>
        </div>

        <!-- Step 3 -->
        <div
          class="
            flex items-start gap-3 rounded-lg border p-3 transition-colors
            hover:border-primary/50
          "
          :class="currentStep === 3 ? 'border-primary bg-primary/5' : 'bg-card'"
        >
          <div
            class="
              flex size-8 shrink-0 items-center justify-center rounded-md
              bg-primary/10 text-primary
            "
          >
            <UserPlus class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-foreground">
              {{ $t('onboarding.step3_title') }}
            </h4>
            <p class="text-xs text-muted-foreground">
              {{ $t('onboarding.step3_description') }}
            </p>
          </div>
          <Button size="sm" variant="ghost" class="shrink-0" @click="handleGoTo('/dashboard/settings/team')">
            <ArrowRight class="size-3.5" />
          </Button>
        </div>
      </div>

      <div class="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" size="sm" @click="handleComplete">
          {{ $t('onboarding.skip') }}
        </Button>
        <Button size="sm" class="gap-1.5" @click="handleComplete">
          <Sparkles class="size-3.5" />
          {{ $t('onboarding.get_started') }}
        </Button>
      </div>
    </div>
  </ResponsiveModal>
</template>
