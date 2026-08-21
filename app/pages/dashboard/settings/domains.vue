<script setup lang="ts">
import { Globe, Plus, RefreshCw, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization, customDomains, fetchCustomDomains } = useSaaS()
const addOpen = shallowRef(false)
const verifying = ref<string | null>(null)

onMounted(() => {
  if (activeOrganization.value?.id) {
    fetchCustomDomains()
  }
})

watch(activeOrganization, (org) => {
  if (org?.id) {
    fetchCustomDomains(org.id)
  }
})

async function verifyDomain(domainId: string) {
  if (!activeOrganization.value?.id)
    return
  verifying.value = domainId
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/domains/${domainId}/verify`, {
      method: 'POST',
    })
    toast('Domain verification refreshed')
    await fetchCustomDomains()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Verification failed')
  }
  finally {
    verifying.value = null
  }
}

async function removeDomain(domainId: string) {
  if (!activeOrganization.value?.id)
    return
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/domains/${domainId}`, {
      method: 'DELETE',
    })
    toast('Custom domain deleted')
    await fetchCustomDomains()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to delete domain')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Custom Domains
        </h2>
        <p class="text-sm text-muted-foreground">
          Connect your custom domains for branded short links.
        </p>
      </div>
      <Button @click="addOpen = true">
        <Plus class="mr-2 size-4" />
        Add Domain
      </Button>
    </div>

    <div
      v-if="customDomains.length === 0" class="
        rounded-lg border border-dashed p-8 text-center
      "
    >
      <Globe class="mx-auto size-8 text-muted-foreground" />
      <h3 class="mt-2 text-sm font-medium">
        No custom domains connected
      </h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Upgrade your plan and connect your first branded domain.
      </p>
      <Button class="mt-4" size="sm" @click="addOpen = true">
        Connect Domain
      </Button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="d in customDomains" :key="d.id" class="
          rounded-lg border bg-card p-4
        "
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Globe class="size-5 text-primary" />
            <div>
              <p class="font-semibold">
                {{ d.domain }}
              </p>
              <div
                class="
                  flex items-center gap-2 pt-1 text-xs text-muted-foreground
                "
              >
                <span>Status:</span>
                <Badge
                  :variant="d.status === 'active' ? 'default' : 'secondary'" class="
                    capitalize
                  "
                >
                  {{ d.status }}
                </Badge>
                <span>• SSL:</span>
                <Badge variant="outline" class="capitalize">
                  {{ d.sslStatus || 'active' }}
                </Badge>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="verifying === d.id"
              @click="verifyDomain(d.id)"
            >
              <RefreshCw class="mr-1.5 size-3.5" :class="{ 'animate-spin': verifying === d.id }" />
              Verify DNS
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="text-destructive"
              @click="removeDomain(d.id)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>

        <div
          v-if="d.status !== 'active'" class="
            mt-4 rounded-md bg-muted p-3 text-xs
          "
        >
          <p class="font-medium text-foreground">
            DNS Configuration Required:
          </p>
          <div class="mt-1 space-y-1 font-mono text-muted-foreground">
            <p>Type: <span class="font-semibold text-foreground">CNAME</span></p>
            <p>Name: <span class="font-semibold text-foreground">{{ d.domain }}</span></p>
            <p>Target: <span class="font-semibold text-foreground">{{ d.verificationDns?.cnameTarget || 'cname.sink.cool' }}</span></p>
          </div>
        </div>
      </div>
    </div>

    <DashboardSaasAddDomainModal v-model:open="addOpen" @success="fetchCustomDomains()" />
  </div>
</template>
