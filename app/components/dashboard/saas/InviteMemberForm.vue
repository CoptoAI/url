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
    email: '',
    role: 'member' as 'admin' | 'member' | 'viewer',
  },
  onSubmit: async ({ value }) => {
    if (!activeOrganization.value?.id)
      return
    try {
      await useAPI(`/api/organizations/${activeOrganization.value.id}/invite`, {
        method: 'POST',
        body: value,
      })
      toast('Invitation sent successfully')
      emit('success')
    }
    catch (err: any) {
      toast.error(err.data?.message || err.statusText || 'Failed to send invitation')
    }
  },
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="form.handleSubmit">
    <form.Field
      name="email"
      :validators="{
        onChange: z.string().email('Please enter a valid email address'),
      }"
    >
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="invite-email">Team Member Email</Label>
          <Input
            id="invite-email"
            type="email"
            :model-value="field.state.value"
            placeholder="colleague@company.com"
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

    <form.Field name="role">
      <template #default="{ field }">
        <div class="space-y-1.5">
          <Label for="invite-role">Role</Label>
          <select
            id="invite-role"
            class="
              flex h-9 w-full rounded-md border border-input bg-transparent px-3
              py-1 text-sm shadow-xs transition-colors
              focus-visible:ring-1 focus-visible:ring-ring
              focus-visible:outline-none
            "
            :value="field.state.value"
            @change="(e: any) => field.handleChange(e.target.value)"
          >
            <option value="viewer">
              Viewer (Read-only analytics)
            </option>
            <option value="member">
              Member (Create & edit links)
            </option>
            <option value="admin">
              Admin (Manage team & domains)
            </option>
          </select>
        </div>
      </template>
    </form.Field>

    <div class="flex justify-end pt-2">
      <Button type="submit">
        Send Invitation
      </Button>
    </div>
  </form>
</template>
