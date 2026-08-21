<script setup lang="ts">
import type { ApiKeyItem } from '#shared/types/saas'
import { Key, Plus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization } = useSaaS()
const apiKeys = ref<ApiKeyItem[]>([])
const createOpen = shallowRef(false)

async function fetchKeys() {
  if (!activeOrganization.value?.id)
    return
  try {
    const data = await useAPI<ApiKeyItem[]>(`/api/organizations/${activeOrganization.value.id}/api-keys`)
    apiKeys.value = data
  }
  catch (err: any) {
    console.error('Failed to fetch api keys:', err)
  }
}

onMounted(() => {
  fetchKeys()
})

watch(activeOrganization, () => {
  fetchKeys()
})

async function removeKey(keyId: string) {
  if (!activeOrganization.value?.id)
    return
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/api-keys/${keyId}`, {
      method: 'DELETE',
    })
    toast('API key revoked')
    await fetchKeys()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to revoke key')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          API Keys
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
        No API keys generated
      </h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Create an API key to integrate your apps with this workspace.
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
                class="text-destructive"
                @click="removeKey(k.id)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DashboardSaasCreateApiKeyModal v-model:open="createOpen" @success="fetchKeys" />
  </div>
</template>
