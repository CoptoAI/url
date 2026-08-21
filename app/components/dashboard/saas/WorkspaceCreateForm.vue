<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const emit = defineEmits<{
  success: [org: any]
}>()

const { fetchOrganizations, switchOrganization } = useSaaS()

const form = useForm({
  defaultValues: {
    name: '',
    slug: '',
  },
  onSubmit: async ({ value }) => {
    try {
      const org = await useAPI('/api/organizations', {
        method: 'POST',
        body: value,
      })
      toast('Workspace created successfully')
      await fetchOrganizations()
      switchOrganization(org as any)
      emit('success', org)
    }
    catch (err: any) {
      toast.error(err.data?.message || err.statusText || 'Failed to create workspace')
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
          <Label for="workspace-name">Workspace Name</Label>
          <Input
            id="workspace-name"
            :model-value="field.state.value"
            placeholder="Acme Corp"
            required
            @input="(e: any) => {
              field.handleChange(e.target.value)
              if (!form.getFieldValue('slug')) {
                form.setFieldValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
              }
            }"
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

    <form.Field
      name="slug"
      :validators="{
        onChange: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Alphanumeric and hyphens only'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="workspace-slug">Slug Identifier</Label>
          <Input
            id="workspace-slug"
            :model-value="field.state.value"
            placeholder="acme-corp"
            required
            @input="(e: any) => field.handleChange(e.target.value.toLowerCase())"
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

    <div class="flex justify-end pt-2">
      <Button type="submit">
        Create Workspace
      </Button>
    </div>
  </form>
</template>
