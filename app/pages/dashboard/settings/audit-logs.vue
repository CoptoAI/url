<script setup lang="ts">
import { Code, RefreshCw } from '@lucide/vue'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization } = useSaaS()

interface AuditItem {
  id: string
  organizationId: string
  actorId: string
  actorType: 'user' | 'api_key' | 'system'
  actorEmail?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  details?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: number
}

const logs = shallowRef<AuditItem[]>([])
const isLoading = shallowRef(false)
const selectedLog = shallowRef<AuditItem | null>(null)
const inspectorOpen = shallowRef(false)
const selectedAction = shallowRef('all')

async function fetchAuditLogs() {
  if (!activeOrganization.value?.id)
    return

  isLoading.value = true
  try {
    const params: Record<string, string> = { limit: '50' }
    if (selectedAction.value !== 'all') {
      params.action = selectedAction.value
    }

    const res = await useAPI<{ items: AuditItem[] }>(
      `/api/organizations/${activeOrganization.value.id}/audit-logs`,
      { params },
    )
    logs.value = res?.items || []
  }
  catch (err) {
    console.error('Failed to fetch audit logs:', err)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAuditLogs()
})

watch(activeOrganization, () => {
  fetchAuditLogs()
})

watch(selectedAction, () => {
  fetchAuditLogs()
})

function inspectLog(log: AuditItem) {
  selectedLog.value = log
  inspectorOpen.value = true
}

function getActionBadgeVariant(action: string) {
  if (action.includes('delete') || action.includes('revoked'))
    return 'destructive'
  if (action.includes('create') || action.includes('invited'))
    return 'default'
  return 'secondary'
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
          {{ $t('audit.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('audit.description') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Select v-model="selectedAction">
          <SelectTrigger class="w-[180px]">
            <SelectValue :placeholder="$t('audit.filter.all_actions')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {{ $t('audit.filter.all_actions') }}
            </SelectItem>
            <SelectItem value="link.created">
              link.created
            </SelectItem>
            <SelectItem value="link.deleted">
              link.deleted
            </SelectItem>
            <SelectItem value="webhook.created">
              webhook.created
            </SelectItem>
            <SelectItem value="webhook.deleted">
              webhook.deleted
            </SelectItem>
            <SelectItem value="member.invited">
              member.invited
            </SelectItem>
            <SelectItem value="api_key.created">
              api_key.created
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" :disabled="isLoading" @click="fetchAuditLogs">
          <RefreshCw class="size-4" :class="isLoading ? 'animate-spin' : ''" />
        </Button>
      </div>
    </div>

    <div class="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t('audit.table.timestamp') }}</TableHead>
            <TableHead>{{ $t('audit.table.actor') }}</TableHead>
            <TableHead>{{ $t('audit.table.action') }}</TableHead>
            <TableHead>{{ $t('audit.table.resource') }}</TableHead>
            <TableHead>{{ $t('audit.table.ip') }}</TableHead>
            <TableHead class="text-right">
              {{ $t('audit.table.details') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="logs.length === 0">
            <TableCell
              colspan="6" class="h-24 text-center text-muted-foreground"
            >
              {{ isLoading ? $t('common.loading') : $t('audit.empty') }}
            </TableCell>
          </TableRow>
          <TableRow v-for="log in logs" :key="log.id">
            <TableCell class="text-xs whitespace-nowrap text-muted-foreground">
              {{ new Date(log.createdAt * 1000).toLocaleString() }}
            </TableCell>
            <TableCell>
              <div class="flex flex-col">
                <span class="font-medium text-foreground">
                  {{ log.actorEmail || log.actorId }}
                </span>
                <span class="text-[11px] text-muted-foreground capitalize">
                  {{ log.actorType }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                :variant="getActionBadgeVariant(log.action)" class="
                  font-mono text-[11px]
                "
              >
                {{ log.action }}
              </Badge>
            </TableCell>
            <TableCell class="font-mono text-xs text-muted-foreground">
              {{ log.resourceType }} <span v-if="log.resourceId">({{ log.resourceId }})</span>
            </TableCell>
            <TableCell class="font-mono text-xs text-muted-foreground">
              {{ log.ipAddress || '—' }}
            </TableCell>
            <TableCell class="text-right">
              <Button size="sm" variant="ghost" @click="inspectLog(log)">
                <Code class="mr-1.5 size-3.5" />
                Inspect
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <DashboardSaasAuditDetailsModal
      v-model:open="inspectorOpen"
      :log="selectedLog"
    />
  </div>
</template>
