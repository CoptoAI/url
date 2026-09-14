<script setup lang="ts">
import type { OrganizationMember } from '#shared/types/saas'
import { Loader2, Trash2, UserPlus } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization, members, fetchMembers, isLoading } = useSaaS()
const inviteOpen = shallowRef(false)
const memberToDelete = shallowRef<OrganizationMember | null>(null)
const deleteConfirmOpen = shallowRef(false)
const isDeleting = shallowRef(false)

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

function confirmRemoveMember(member: OrganizationMember) {
  memberToDelete.value = member
  deleteConfirmOpen.value = true
}

async function handleRemoveMember() {
  if (!activeOrganization.value?.id || !memberToDelete.value || isDeleting.value)
    return

  isDeleting.value = true
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/members/${memberToDelete.value.userId}`, {
      method: 'DELETE',
    })
    toast('Team member removed successfully')
    deleteConfirmOpen.value = false
    memberToDelete.value = null
    await fetchMembers()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to remove member')
  }
  finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ $t('nav.team') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          Manage workspace members and their access roles.
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
          <TableRow v-if="members.length === 0">
            <TableCell
              colspan="4" class="h-24 text-center text-muted-foreground"
            >
              {{ isLoading ? $t('common.loading') : 'No members in this workspace' }}
            </TableCell>
          </TableRow>
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
                class="
                  text-destructive
                  hover:text-destructive
                "
                @click="confirmRemoveMember(m)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DashboardSaasInviteMemberModal v-model:open="inviteOpen" @success="fetchMembers()" />

    <!-- Remove Member Confirmation Dialog -->
    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove team member?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong class="text-foreground">{{ memberToDelete?.user.name }}</strong> ({{ memberToDelete?.user.email }}) from this workspace? They will lose access to all workspace resources.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeleting">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="isDeleting"
            :aria-busy="isDeleting"
            @click.prevent="handleRemoveMember"
          >
            <Loader2
              v-if="isDeleting" class="
                mr-1.5 size-4
                motion-safe:animate-spin
              "
            />
            Remove Member
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
