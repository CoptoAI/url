<script setup lang="ts">
defineProps<{
  open: boolean
  log: {
    id: string
    action: string
    resourceType: string
    resourceId?: string | null
    actorEmail?: string | null
    actorId: string
    actorType: string
    ipAddress?: string | null
    userAgent?: string | null
    details?: Record<string, unknown> | null
    createdAt: number
  } | null
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <ResponsiveModal
    :open="open"
    :title="$t('audit.inspector_title')"
    :description="log ? `${log.action} • ${new Date(log.createdAt * 1000).toLocaleString()}` : ''"
    @update:open="$emit('update:open', $event)"
  >
    <div v-if="log" class="space-y-4 p-4 text-sm">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="rounded-md border p-2">
          <span class="text-muted-foreground">Actor:</span>
          <p class="font-mono font-medium text-foreground">
            {{ log.actorEmail || log.actorId }} ({{ log.actorType }})
          </p>
        </div>
        <div class="rounded-md border p-2">
          <span class="text-muted-foreground">Resource:</span>
          <p class="font-mono font-medium text-foreground">
            {{ log.resourceType }}: {{ log.resourceId || 'N/A' }}
          </p>
        </div>
        <div class="rounded-md border p-2">
          <span class="text-muted-foreground">IP Address:</span>
          <p class="font-mono font-medium text-foreground">
            {{ log.ipAddress || 'Unknown' }}
          </p>
        </div>
        <div class="rounded-md border p-2">
          <span class="text-muted-foreground">User Agent:</span>
          <p class="truncate font-mono font-medium text-foreground" :title="log.userAgent || ''">
            {{ log.userAgent || 'Unknown' }}
          </p>
        </div>
      </div>

      <div class="space-y-1.5">
        <span class="text-xs font-medium text-muted-foreground">Event Payload (JSON):</span>
        <pre
          class="
            max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs
            text-foreground
          "
        >{{ JSON.stringify(log.details || {}, null, 2) }}</pre>
      </div>

      <div class="flex justify-end border-t pt-4">
        <Button variant="outline" size="sm" @click="$emit('update:open', false)">
          {{ $t('common.close') }}
        </Button>
      </div>
    </div>
  </ResponsiveModal>
</template>
