<script setup lang="ts">
import { Copy, History, Plus, RefreshCw, RotateCw, Send, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization } = useSaaS()

interface WebhookItem {
  id: string
  organizationId: string
  url: string
  secret: string
  secretPrefix: string
  events: string[]
  description?: string | null
  isActive: boolean
  createdAt: number
}

interface DeliveryItem {
  id: string
  event: string
  statusCode?: number | null
  responseBody?: string | null
  durationMs?: number | null
  isSuccess: boolean
  createdAt: number
}

const webhooks = shallowRef<WebhookItem[]>([])
const isLoading = shallowRef(false)
const createOpen = shallowRef(false)
const secretModalOpen = shallowRef(false)
const newlyCreatedSecret = shallowRef('')
const newlyCreatedUrl = shallowRef('')

const deliveriesOpen = shallowRef(false)
const activeWebhookForDeliveries = shallowRef<WebhookItem | null>(null)
const deliveries = shallowRef<DeliveryItem[]>([])
const isTestingPing = shallowRef<Record<string, boolean>>({})

async function fetchWebhooks() {
  if (!activeOrganization.value?.id)
    return

  isLoading.value = true
  try {
    const res = await useAPI<{ webhooks: WebhookItem[] }>(
      `/api/organizations/${activeOrganization.value.id}/webhooks`,
    )
    webhooks.value = res?.webhooks || []
  }
  catch (err) {
    console.error('Failed to fetch webhooks:', err)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchWebhooks()
})

watch(activeOrganization, () => {
  fetchWebhooks()
})

function handleCreated(created: { id: string, secret: string, url: string }) {
  createOpen.value = false
  newlyCreatedSecret.value = created.secret
  newlyCreatedUrl.value = created.url
  secretModalOpen.value = true
  fetchWebhooks()
}

function copySecret() {
  if (typeof navigator !== 'undefined') {
    navigator.clipboard.writeText(newlyCreatedSecret.value)
    toast('Signing secret copied to clipboard')
  }
}

const webhookToDelete = shallowRef<WebhookItem | null>(null)
const deleteConfirmOpen = shallowRef(false)
const isDeleting = shallowRef(false)

function confirmDeleteWebhook(webhook: WebhookItem) {
  webhookToDelete.value = webhook
  deleteConfirmOpen.value = true
}

async function handleConfirmDelete() {
  if (!activeOrganization.value?.id || !webhookToDelete.value || isDeleting.value)
    return

  isDeleting.value = true
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/webhooks/${webhookToDelete.value.id}`, {
      method: 'DELETE',
    })
    toast('Webhook deleted successfully')
    deleteConfirmOpen.value = false
    webhookToDelete.value = null
    await fetchWebhooks()
  }
  catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Failed to delete webhook')
  }
  finally {
    isDeleting.value = false
  }
}

async function sendTestPing(webhook: WebhookItem) {
  if (!activeOrganization.value?.id)
    return

  isTestingPing.value = { ...isTestingPing.value, [webhook.id]: true }
  try {
    const res = await useAPI<{ success: boolean, statusCode: number, durationMs: number }>(
      `/api/organizations/${activeOrganization.value.id}/webhooks/${webhook.id}/test`,
      { method: 'POST' },
    )
    if (res?.success) {
      toast.success(`Ping sent! HTTP ${res.statusCode} (${res.durationMs}ms)`)
    }
    else {
      toast.error(`Ping failed: HTTP ${res?.statusCode || 500} (${res?.durationMs || 0}ms)`)
    }
  }
  catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Test ping failed')
  }
  finally {
    isTestingPing.value = { ...isTestingPing.value, [webhook.id]: false }
  }
}

async function viewDeliveries(webhook: WebhookItem) {
  if (!activeOrganization.value?.id)
    return

  activeWebhookForDeliveries.value = webhook
  deliveriesOpen.value = true
  try {
    const res = await useAPI<{ deliveries: DeliveryItem[] }>(
      `/api/organizations/${activeOrganization.value.id}/webhooks/${webhook.id}/deliveries`,
    )
    deliveries.value = res?.deliveries || []
  }
  catch (err) {
    console.error('Failed to fetch deliveries:', err)
  }
}

const retryingDelivery = shallowRef<Record<string, boolean>>({})

async function retryDelivery(deliveryId: string) {
  if (!activeOrganization.value?.id || !activeWebhookForDeliveries.value?.id)
    return

  retryingDelivery.value = { ...retryingDelivery.value, [deliveryId]: true }
  try {
    const res = await useAPI<{ success: boolean, statusCode: number }>(
      `/api/organizations/${activeOrganization.value.id}/webhooks/${activeWebhookForDeliveries.value.id}/deliveries/${deliveryId}/retry`,
      { method: 'POST' },
    )
    if (res?.success) {
      toast.success('Webhook redelivered successfully')
    }
    else {
      toast.error(`Redelivery responded with HTTP ${res?.statusCode || 500}`)
    }
    await viewDeliveries(activeWebhookForDeliveries.value)
  }
  catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Failed to redeliver webhook')
  }
  finally {
    retryingDelivery.value = { ...retryingDelivery.value, [deliveryId]: false }
  }
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="
        flex flex-col gap-4
        sm:flex-row sm:items-center sm:justify-between
      "
    >
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ $t('webhooks.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('webhooks.description') }}
        </p>
      </div>
      <Button @click="createOpen = true">
        <Plus class="mr-2 size-4" />
        {{ $t('webhooks.create_webhook') }}
      </Button>
    </div>

    <div class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t('webhooks.url') }}</TableHead>
            <TableHead>{{ $t('webhooks.events') }}</TableHead>
            <TableHead>{{ $t('webhooks.secret') }}</TableHead>
            <TableHead>{{ $t('webhooks.status') }}</TableHead>
            <TableHead class="text-right">
              {{ $t('common.actions') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="webhooks.length === 0">
            <TableCell
              colspan="5" class="h-24 text-center text-muted-foreground"
            >
              {{ isLoading ? $t('common.loading') : $t('webhooks.empty') }}
            </TableCell>
          </TableRow>
          <TableRow v-for="wh in webhooks" :key="wh.id">
            <TableCell>
              <div class="flex flex-col">
                <span class="font-mono text-sm font-medium text-foreground">
                  {{ wh.url }}
                </span>
                <span
                  v-if="wh.description" class="text-xs text-muted-foreground"
                >
                  {{ wh.description }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-for="ev in wh.events"
                  :key="ev"
                  variant="outline"
                  class="text-[10px]"
                >
                  {{ ev }}
                </Badge>
              </div>
            </TableCell>
            <TableCell class="font-mono text-xs text-muted-foreground">
              {{ wh.secretPrefix }}
            </TableCell>
            <TableCell>
              <Badge :variant="wh.isActive ? 'default' : 'secondary'">
                {{ wh.isActive ? 'Active' : 'Disabled' }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="isTestingPing[wh.id]"
                  @click="sendTestPing(wh)"
                >
                  <Send class="mr-1.5 size-3.5" />
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click="viewDeliveries(wh)"
                >
                  <History class="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="
                    text-destructive
                    hover:text-destructive
                  "
                  @click="confirmDeleteWebhook(wh)"
                >
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create Modal -->
    <ResponsiveModal
      v-model:open="createOpen"
      :title="$t('webhooks.create_webhook')"
      :description="$t('webhooks.description')"
    >
      <div class="p-4">
        <DashboardSaasWebhookForm
          v-if="activeOrganization"
          :organization-id="activeOrganization.id"
          @success="handleCreated"
          @cancel="createOpen = false"
        />
      </div>
    </ResponsiveModal>

    <!-- Secret Display Modal -->
    <ResponsiveModal
      v-model:open="secretModalOpen"
      :title="$t('webhooks.secret')"
      :description="$t('webhooks.secret_notice')"
    >
      <div class="space-y-4 p-4">
        <div class="rounded-md border bg-muted p-3">
          <p class="font-mono text-xs break-all text-foreground">
            {{ newlyCreatedSecret }}
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" size="sm" @click="copySecret">
            <Copy class="mr-1.5 size-3.5" />
            {{ $t('webhooks.secret_copy') }}
          </Button>
          <Button size="sm" @click="secretModalOpen = false">
            {{ $t('common.done') }}
          </Button>
        </div>
      </div>
    </ResponsiveModal>

    <!-- Delivery History Modal -->
    <ResponsiveModal
      v-model:open="deliveriesOpen"
      :title="$t('webhooks.delivery_history_title')"
      :description="activeWebhookForDeliveries?.url || ''"
    >
      <div class="max-h-[60vh] space-y-2 overflow-auto p-4 text-xs">
        <div
          v-if="deliveries.length === 0" class="
            py-8 text-center text-muted-foreground
          "
        >
          {{ $t('webhooks.delivery_empty') }}
        </div>
        <div
          v-for="del in deliveries"
          :key="del.id"
          class="flex items-center justify-between rounded-lg border p-2.5"
        >
          <div class="flex items-center gap-2">
            <Badge :variant="del.isSuccess ? 'default' : 'destructive'">
              HTTP {{ del.statusCode || 'ERR' }}
            </Badge>
            <span class="font-mono font-medium">{{ del.event }}</span>
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <span>{{ del.durationMs }}ms</span>
            <span>{{ new Date(del.createdAt * 1000).toLocaleTimeString() }}</span>
            <Button
              size="sm"
              variant="outline"
              class="h-6 px-2 text-[11px]"
              :disabled="retryingDelivery[del.id]"
              @click="retryDelivery(del.id)"
            >
              <RefreshCw
                v-if="retryingDelivery[del.id]" class="
                  mr-1 size-2.5
                  motion-safe:animate-spin
                "
              />
              <RotateCw v-else class="mr-1 size-2.5" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveModal>

    <!-- Delete Webhook Confirmation Dialog -->
    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the webhook for <strong
              class="font-mono text-xs text-foreground"
            >{{ webhookToDelete?.url }}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeleting">
            {{ $t('common.cancel') }}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="isDeleting"
            :aria-busy="isDeleting"
            @click.prevent="handleConfirmDelete"
          >
            <Loader2
              v-if="isDeleting" class="
                mr-1.5 size-4
                motion-safe:animate-spin
              "
            />
            Delete Webhook
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
