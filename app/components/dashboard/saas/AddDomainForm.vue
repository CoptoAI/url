<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const emit = defineEmits<{
  success: []
}>()

const { activeOrganization } = useSaaS()

const form = useForm({
  defaultValues: {
    domain: '',
  },
  onSubmit: async ({ value }) => {
    if (!activeOrganization.value?.id)
      return
    try {
      await useAPI(`/api/organizations/${activeOrganization.value.id}/domains`, {
        method: 'POST',
        body: value,
      })
      toast('Custom domain registered. Please configure DNS.')
      emit('success')
    }
    catch (err: any) {
      toast.error(err.data?.message || err.statusText || 'Failed to add custom domain')
    }
  },
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="form.handleSubmit">
    <form.Field
      name="domain"
      :validators="{
        onChange: z.string().min(3).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/, 'Please enter a valid domain (e.g. links.yourbrand.com)'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="custom-domain">Domain / Subdomain</Label>
          <Input
            id="custom-domain"
            :model-value="field.state.value"
            placeholder="links.yourbrand.com"
            required
            @input="(e: any) => field.handleChange(e.target.value.toLowerCase().trim())"
          />
          <span
            v-if="field.state.meta.errors.length" class="
              text-xs text-destructive
            "
          >
            {{ field.state.meta.errors[0] }}
          </span>
          <p class="text-xs text-muted-foreground">
            Enter the custom domain or subdomain where your shortened links will resolve.
          </p>
        </div>
      </template>
    </form.Field>

    <div class="flex justify-end pt-2">
      <Button type="submit">
        Add Domain
      </Button>
    </div>
  </form>
</template>
