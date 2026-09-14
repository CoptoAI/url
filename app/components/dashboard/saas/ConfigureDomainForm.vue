<script setup lang="ts">
import type { CustomDomain } from '#shared/types/saas'
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const props = defineProps<{
  domain: CustomDomain
}>()

const emit = defineEmits<{
  success: []
}>()

const { activeOrganization } = useSaaS()

const urlValidator = z.string().refine(val => !val || /^https?:\/\/.+/.test(val), 'Please enter a valid URL (e.g. https://yourbrand.com)')

const form = useForm({
  defaultValues: {
    rootRedirectUrl: props.domain.rootRedirectUrl || '',
    notFoundRedirectUrl: props.domain.notFoundRedirectUrl || '',
  },
  onSubmit: async ({ value }) => {
    if (!activeOrganization.value?.id)
      return
    try {
      await useAPI(`/api/organizations/${activeOrganization.value.id}/domains/${props.domain.id}`, {
        method: 'PATCH',
        body: {
          rootRedirectUrl: value.rootRedirectUrl || null,
          notFoundRedirectUrl: value.notFoundRedirectUrl || null,
        },
      })
      toast('Domain configuration updated successfully')
      emit('success')
    }
    catch (err: any) {
      toast.error(err.data?.message || err.statusText || 'Failed to update domain configuration')
    }
  },
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="form.handleSubmit">
    <div class="rounded-md border bg-muted/40 p-3 text-xs">
      <p class="font-medium text-foreground">
        Configuring: <span class="font-mono font-semibold text-primary">{{ domain.domain }}</span>
      </p>
      <p class="mt-0.5 text-muted-foreground">
        Customize where visitors will be directed when accessing the root domain or non-existent slugs.
      </p>
    </div>

    <form.Field
      name="rootRedirectUrl"
      :validators="{
        onChange: urlValidator,
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="root-redirect">Root Redirect URL (Optional)</Label>
          <Input
            id="root-redirect"
            :model-value="field.state.value"
            placeholder="https://yourbrand.com"
            @input="(e: any) => field.handleChange(e.target.value.trim())"
          />
          <span
            v-if="field.state.meta.errors.length"
            class="text-xs text-destructive"
          >
            {{ field.state.meta.errors[0] }}
          </span>
          <p class="text-xs text-muted-foreground">
            Where to send visitors when they navigate to https://{{ domain.domain }}/ directly.
          </p>
        </div>
      </template>
    </form.Field>

    <form.Field
      name="notFoundRedirectUrl"
      :validators="{
        onChange: urlValidator,
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="not-found-redirect">404 Not Found Redirect URL (Optional)</Label>
          <Input
            id="not-found-redirect"
            :model-value="field.state.value"
            placeholder="https://yourbrand.com/404"
            @input="(e: any) => field.handleChange(e.target.value.trim())"
          />
          <span
            v-if="field.state.meta.errors.length"
            class="text-xs text-destructive"
          >
            {{ field.state.meta.errors[0] }}
          </span>
          <p class="text-xs text-muted-foreground">
            Where to send visitors when they access an invalid or deleted short link on this domain.
          </p>
        </div>
      </template>
    </form.Field>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="submit">
        Save Changes
      </Button>
    </div>
  </form>
</template>
