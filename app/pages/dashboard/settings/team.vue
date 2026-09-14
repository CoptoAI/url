<script setup lang="ts">
import type { OrganizationInvite, OrganizationMember } from '#shared/types/saas'
import { Check, Copy, Loader2, Mail, Trash2, UserPlus } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization, members, invites, fetchMembers, fetchInvites, isLoading } = useSaaS()
const inviteOpen = shallowRef(false)
const memberToDelete = shallowRef<OrganizationMember | null>(null)
const deleteConfirmOpen = shallowRef(false)
const isDeleting = shallowRef(false)

const copiedInviteId = ref<string | null>(null)
const inviteToRevoke = shallowRef<OrganizationInvite | null>(null)
const revokeConfirmOpen = shallowRef(false)
const isRevoking = shallowRef(false)

onMounted(() => {
  if (activeOrganization.value?.id) {
    fetchMembers()
    fetchInvites()
  }
})

watch(activeOrganization, (org) => {
  if (org?.id) {
    fetchMembers(org.id)
    fetchInvites(org.id)
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

function copyInviteLink(invite: OrganizationInvite) {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://dash.shaf.app'
  const link = `${origin}/auth/invite?token=${invite.token}`
  navigator.clipboard.writeText(link)
  copiedInviteId.value = invite.id
  toast.success('Invitation link copied to clipboard')
  setTimeout(() => {
    if (copiedInviteId.value === invite.id) {
      copiedInviteId.value = null
    }
  }, 1500)
}

function confirmRevokeInvite(invite: OrganizationInvite) {
  inviteToRevoke.value = invite
  revokeConfirmOpen.value = true
}

async function handleRevokeInvite() {
  if (!activeOrganization.value?.id || !inviteToRevoke.value || isRevoking.value)
    return

  isRevoking.value = true
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/invites/${inviteToRevoke.value.id}`, {
      method: 'DELETE',
    })
    toast('Invitation revoked successfully')
    revokeConfirmOpen.value = false
    inviteToRevoke.value = null
    await fetchInvites()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to revoke invitation')
  }
  finally {
    isRevoking.value = false
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

    <!-- Active Members Section -->
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

    <!-- Pending Invitations Section -->
    <div class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold tracking-tight">
            Pending Invitations
          </h3>
          <p class="text-sm text-muted-foreground">
            Invitations sent to future teammates that have not yet been accepted.
          </p>
        </div>
        <Badge v-if="invites.length > 0" variant="outline" class="text-xs">
          {{ invites.length }} {{ invites.length === 1 ? 'invite' : 'invites' }}
        </Badge>
      </div>

      <div class="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead class="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="invites.length === 0">
              <TableCell
                colspan="5" class="
                  h-20 text-center text-sm text-muted-foreground
                "
              >
                No pending invitations for this workspace
              </TableCell>
            </TableRow>
            <TableRow v-for="inv in invites" :key="inv.id">
              <TableCell>
                <div class="flex items-center gap-2">
                  <Mail class="size-4 text-muted-foreground" />
                  <span class="text-sm font-medium">{{ inv.email }}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" class="capitalize">
                  {{ inv.role }}
                </Badge>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{ inv.inviterName || 'Workspace Admin' }}
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{ new Date(inv.expiresAt * 1000).toLocaleDateString() }}
              </TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 gap-1 px-2 text-xs"
                    @click="copyInviteLink(inv)"
                  >
                    <Check
                      v-if="copiedInviteId === inv.id" class="
                        size-3.5 text-primary
                      "
                    />
                    <Copy v-else class="size-3.5" />
                    {{ copiedInviteId === inv.id ? 'Copied' : 'Copy Link' }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="
                      size-8 text-destructive
                      hover:text-destructive
                    "
                    @click="confirmRevokeInvite(inv)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <DashboardSaasInviteMemberModal
      v-model:open="inviteOpen"
      @success="async () => {
        await fetchMembers()
        await fetchInvites()
      }"
    />

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

    <!-- Revoke Invite Confirmation Dialog -->
    <AlertDialog :open="revokeConfirmOpen" @update:open="revokeConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke the invitation for <strong
              class="text-foreground"
            >{{ inviteToRevoke?.email }}</strong>? The invitation link will immediately become invalid.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isRevoking">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="isRevoking"
            :aria-busy="isRevoking"
            @click.prevent="handleRevokeInvite"
          >
            <Loader2
              v-if="isRevoking"
              class="
                mr-1.5 size-4
                motion-safe:animate-spin
              "
            />
            Revoke Invitation
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
