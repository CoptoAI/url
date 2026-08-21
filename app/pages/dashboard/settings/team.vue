<script setup lang="ts">
import { Trash2, UserPlus } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization, members, fetchMembers } = useSaaS()
const inviteOpen = shallowRef(false)

onMounted(() => {
  if (activeOrganization.value?.id) {
    fetchMembers()
  }
})

watch(activeOrganization, (org) => {
  if (org?.id) {
    fetchMembers(org.id)
  }
})

async function removeMember(userId: string) {
  if (!activeOrganization.value?.id)
    return
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/members/${userId}`, {
      method: 'DELETE',
    })
    toast('Team member removed')
    await fetchMembers()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to remove member')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Team Members
        </h2>
        <p class="text-sm text-muted-foreground">
          Manage workspace members and their roles.
        </p>
      </div>
      <Button @click="inviteOpen = true">
        <UserPlus class="mr-2 size-4" />
        Invite Member
      </Button>
    </div>

    <div class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead class="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="m in members" :key="m.userId">
            <TableCell>
              <div class="flex items-center gap-3">
                <Avatar class="size-8">
                  <AvatarFallback>{{ m.user.name.charAt(0).toUpperCase() }}</AvatarFallback>
                </Avatar>
                <div>
                  <p class="text-sm font-medium">
                    {{ m.user.name }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ m.user.email }}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" class="capitalize">
                {{ m.role }}
              </Badge>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground">
              {{ new Date(m.joinedAt * 1000).toLocaleDateString() }}
            </TableCell>
            <TableCell class="text-right">
              <Button
                v-if="m.role !== 'owner'"
                variant="ghost"
                size="icon"
                class="text-destructive"
                @click="removeMember(m.userId)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DashboardSaasInviteMemberModal v-model:open="inviteOpen" @success="fetchMembers()" />
  </div>
</template>
