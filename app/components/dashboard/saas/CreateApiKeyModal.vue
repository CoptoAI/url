<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { toast } from 'vue-sonner'

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>('open', { default: false })
const createdKey = ref<any>(null)
const copied = ref(false)

function handleSuccess(data: any) {
  createdKey.value = data
  emit('success')
}

async function copySecret() {
  if (createdKey.value?.secretKey) {
    await navigator.clipboard.writeText(createdKey.value.secretKey)
    copied.value = true
    toast('API Key copied to clipboard')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function handleClose() {
  createdKey.value = null
  open.value = false
}
</script>

<template>
  <ResponsiveModal
    v-model:open="open"
    title="Create API Key"
    description="Generate an API key for programmatic access to this workspace."
  >
    <div class="p-4">
      <div v-if="createdKey" class="space-y-4">
        <div
          class="
            rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm
            text-amber-600
            dark:text-amber-400
          "
        >
          ⚠️ Copy this secret key now. You will not be able to view it again.
        </div>
        <div class="flex items-center gap-2">
          <Input
            :model-value="createdKey.secretKey" readonly class="
              font-mono text-xs
            "
          />
          <Button variant="outline" size="icon" @click="copySecret">
            <Check v-if="copied" class="size-4 text-emerald-500" />
            <Copy v-else class="size-4" />
          </Button>
        </div>
        <div class="flex justify-end pt-2">
          <Button @click="handleClose">
            Done
          </Button>
        </div>
      </div>
      <DashboardSaasCreateApiKeyForm v-else @success="handleSuccess" />
    </div>
  </ResponsiveModal>
</template>
