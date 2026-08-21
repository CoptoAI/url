<script setup lang="ts">
import type { WebhookEvent } from '#shared/schemas/saas'
import { Check, Loader2 } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'

const props = defineProps<{
  organizationId: string
}>()

const emit = defineEmits<{
  success: [webhook: { id: string, secret: string, url: string }]
  cancel: []
}>()

const availableEvents: { event: WebhookEvent, label: string }[] = [
  { event: 'link.created', label: 'Link Created' },
  { event: 'link.updated', label: 'Link Updated' },
  { event: 'link.deleted', label: 'Link Deleted' },
  { event: 'domain.created', label: 'Domain Added' },
  { event: 'domain.verified', label: 'Domain Verified' },
  { event: 'domain.deleted', label: 'Domain Deleted' },
  { event: 'member.invited', label: 'Member Invited' },
  { event: 'member.removed', label: 'Member Removed' },
  { event: 'api_key.created', label: 'API Key Created' },
  { event: 'api_key.revoked', label: 'API Key Revoked' },
  { event: 'billing.upgraded', label: 'Billing Plan Upgraded' },
]

const isSubmitting = shallowRef(false)
const errorMessage = shallowRef('')

const form = useForm({
  defaultValues: {
    url: '',
    description: '',
    events: ['link.created', 'link.updated', 'link.deleted'] as WebhookEvent[],
  },
  onSubmit: async ({ value }) => {
    if (value.events.length === 0) {
      errorMessage.value = 'Please select at least one event'
      return
    }

    try {
      isSubmitting.value = true
      errorMessage.value = ''

      const res = await useAPI<{ webhook: { id: string, secret: string, url: string } }>(
        `/api/organizations/${props.organizationId}/webhooks`,
        {
          method: 'POST',
          body: {
            url: value.url,
            description: value.description || undefined,
            events: value.events,
          },
        },
      )

      if (res?.webhook) {
        emit('success', res.webhook)
      }
    }
    catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : 'Failed to create webhook'
    }
    finally {
      isSubmitting.value = false
    }
  },
})

function toggleEvent(event: WebhookEvent) {
  const current = form.getFieldValue('events')
  if (current.includes(event)) {
    form.setFieldValue('events', current.filter(e => e !== event))
  }
  else {
    form.setFieldValue('events', [...current, event])
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="form.handleSubmit">
    <div
      v-if="errorMessage" class="
        rounded-md bg-destructive/10 p-3 text-sm text-destructive
      "
    >
      {{ errorMessage }}
    </div>

    <form.Field name="url">
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="webhook-url">{{ $t('webhooks.url') }}</Label>
          <Input
            id="webhook-url"
            :model-value="field.state.value"
            placeholder="https://api.yourdomain.com/webhooks"
            type="url"
            required
            @update:model-value="(val) => field.handleChange(String(val))"
          />
        </div>
      </template>
    </form.Field>

    <form.Field name="description">
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="webhook-desc">{{ $t('webhooks.description_label') }}</Label>
          <Input
            id="webhook-desc"
            :model-value="field.state.value"
            placeholder="e.g. Production Slack Alert"
            @update:model-value="(val) => field.handleChange(String(val))"
          />
        </div>
      </template>
    </form.Field>

    <div class="space-y-2">
      <Label>{{ $t('webhooks.events') }}</Label>
      <div
        class="
          grid grid-cols-1 gap-2
          sm:grid-cols-2
        "
      >
        <div
          v-for="item in availableEvents"
          :key="item.event"
          class="
            flex cursor-pointer items-center justify-between rounded-md border
            p-2 text-xs transition-colors
          "
          :class="form.getFieldValue('events').includes(item.event) ? `
            border-primary bg-primary/5 text-foreground
          ` : `
            text-muted-foreground
            hover:border-border/80
          `"
          @click="toggleEvent(item.event)"
        >
          <span class="font-medium">{{ item.label }}</span>
          <div
            class="flex size-4 items-center justify-center rounded-sm border"
            :class="form.getFieldValue('events').includes(item.event) ? `
              border-primary bg-primary text-primary-foreground
            ` : `border-muted`"
          >
            <Check
              v-if="form.getFieldValue('events').includes(item.event)" class="
                size-3
              "
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-2 border-t pt-4">
      <Button variant="ghost" type="button" @click="$emit('cancel')">
        {{ $t('common.cancel') }}
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="mr-2 size-4 animate-spin" />
        {{ $t('webhooks.create_webhook') }}
      </Button>
    </div>
  </form>
</template>
