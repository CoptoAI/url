<script setup lang="ts">
import type { ApiKeyItem } from '#shared/types/saas'
import { Key, Loader2, Plus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization, isLoading: orgLoading } = useSaaS()
const apiKeys = ref<ApiKeyItem[]>([])
const isLoading = ref(false)
const createOpen = shallowRef(false)
const keyToDelete = shallowRef<ApiKeyItem | null>(null)
const deleteConfirmOpen = shallowRef(false)
const isDeleting = shallowRef(false)

async function fetchKeys() {
  if (!activeOrganization.value?.id)
    return
  isLoading.value = true
  try {
    const data = await useAPI<ApiKeyItem[]>(`/api/organizations/${activeOrganization.value.id}/api-keys`)
    apiKeys.value = data
  }
  catch (err: any) {
    console.error('Failed to fetch api keys:', err)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchKeys()
})

watch(activeOrganization, () => {
  fetchKeys()
})

function confirmRevokeKey(key: ApiKeyItem) {
  keyToDelete.value = key
  deleteConfirmOpen.value = true
}

async function handleRevokeKey() {
  if (!activeOrganization.value?.id || !keyToDelete.value || isDeleting.value)
    return

  isDeleting.value = true
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/api-keys/${keyToDelete.value.id}`, {
      method: 'DELETE',
    })
    toast('API key revoked successfully')
    deleteConfirmOpen.value = false
    keyToDelete.value = null
    await fetchKeys()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to revoke key')
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
          {{ $t('nav.api_keys') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          Manage API keys for programmatic access to this workspace.
        </p>
      </div>
      <Button @click="createOpen = true">
        <Plus class="mr-2 size-4" />
        Create API Key
      </Button>
    </div>

    <div
      v-if="apiKeys.length === 0" class="
        rounded-lg border border-dashed p-8 text-center
      "
    >
      <Key class="mx-auto size-8 text-muted-foreground" />
      <h3 class="mt-2 text-sm font-medium">
        {{ isLoading || orgLoading ? $t('common.loading') : 'No API keys generated' }}
      </h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Create an API key to integrate your backend services with this workspace.
      </p>
      <Button class="mt-4" size="sm" @click="createOpen = true">
        Create API Key
      </Button>
    </div>

    <div v-else class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key Name</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead class="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="k in apiKeys" :key="k.id">
            <TableCell class="font-medium">
              {{ k.name }}
            </TableCell>
            <TableCell class="font-mono text-xs text-muted-foreground">
              {{ k.keyPrefix }}...
            </TableCell>
            <TableCell class="text-xs text-muted-foreground">
              {{ new Date(k.createdAt * 1000).toLocaleDateString() }}
            </TableCell>
            <TableCell class="text-xs text-muted-foreground">
              {{ k.lastUsedAt ? new Date(k.lastUsedAt * 1000).toLocaleDateString() : 'Never' }}
            </TableCell>
            <TableCell class="text-right">
              <Button
                variant="ghost"
                size="icon"
                class="
                  text-destructive
                  hover:text-destructive
                "
                @click="confirmRevokeKey(k)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DashboardSaasCreateApiKeyModal v-model:open="createOpen" @success="fetchKeys" />

    <!-- Revoke Key Confirmation Dialog -->
    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke API key <strong
              class="text-foreground"
            >{{ keyToDelete?.name }}</strong> ({{ keyToDelete?.keyPrefix }}...)? Any applications using this key will immediately be blocked.
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
            @click.prevent="handleRevokeKey"
          >
            <Loader2
              v-if="isDeleting" class="
                mr-1.5 size-4
                motion-safe:animate-spin
              "
            />
            Revoke Key
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
