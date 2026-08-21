<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const emit = defineEmits<{
  success: [apiKey: any]
}>()

const { activeOrganization } = useSaaS()

const form = useForm({
  defaultValues: {
    name: '',
    expiresInDays: 90,
  },
  onSubmit: async ({ value }) => {
    if (!activeOrganization.value?.id)
      return
    try {
      const data = await useAPI(`/api/organizations/${activeOrganization.value.id}/api-keys`, {
        method: 'POST',
        body: value,
      })
      toast('API Key generated successfully')
      emit('success', data)
    }
    catch (err: any) {
      toast.error(err.data?.message || err.statusText || 'Failed to create API key')
    }
  },
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="form.handleSubmit">
    <form.Field
      name="name"
      :validators="{
        onChange: z.string().min(2, 'Name must be at least 2 characters'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="key-name">Key Name / Description</Label>
          <Input
            id="key-name"
            :model-value="field.state.value"
            placeholder="Production Backend Integration"
            required
            @input="(e: any) => field.handleChange(e.target.value)"
          />
          <span
            v-if="field.state.meta.errors.length" class="
              text-xs text-destructive
            "
          >
            {{ field.state.meta.errors[0] }}
          </span>
        </div>
      </template>
    </form.Field>

    <form.Field name="expiresInDays">
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="key-expires">Expiration</Label>
          <select
            id="key-expires"
            class="
              flex h-9 w-full rounded-md border border-input bg-transparent px-3
              py-1 text-sm shadow-xs transition-colors
              focus-visible:ring-1 focus-visible:ring-ring
              focus-visible:outline-none
            "
            :value="field.state.value"
            @change="(e: any) => field.handleChange(Number(e.target.value))"
          >
            <option :value="30">
              30 Days
            </option>
            <option :value="90">
              90 Days
            </option>
            <option :value="365">
              1 Year
            </option>
          </select>
        </div>
      </template>
    </form.Field>

    <div class="flex justify-end pt-2">
      <Button type="submit">
        Generate Key
      </Button>
    </div>
  </form>
</template>
