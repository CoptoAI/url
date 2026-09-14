<script setup lang="ts">
import type { CustomDomain } from '#shared/types/saas'
import { Check, Copy, Globe, Loader2, Plus, RefreshCw, Settings2, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization, customDomains, fetchCustomDomains, isLoading } = useSaaS()
const runtimeConfig = useRuntimeConfig()
const defaultCnameTarget = computed(() => (runtimeConfig.public?.cfFallbackOrigin as string) || 'cname.shaf.is')
const addOpen = shallowRef(false)
const configureOpen = shallowRef(false)
const domainToConfigure = shallowRef<CustomDomain | null>(null)
const verifying = ref<string | null>(null)
const domainToDelete = shallowRef<CustomDomain | null>(null)
const deleteConfirmOpen = shallowRef(false)
const isDeleting = shallowRef(false)
const copiedKey = ref<string | null>(null)

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

function copyText(key: string, text: string) {
  navigator.clipboard.writeText(text)
  copiedKey.value = key
  toast('Copied to clipboard')
  setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = null
    }
  }, 1500)
}

function openConfigure(domain: CustomDomain) {
  domainToConfigure.value = domain
  configureOpen.value = true
}

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

function confirmRemoveDomain(domain: CustomDomain) {
  domainToDelete.value = domain
  deleteConfirmOpen.value = true
}

async function handleRemoveDomain() {
  if (!activeOrganization.value?.id || !domainToDelete.value || isDeleting.value)
    return

  isDeleting.value = true
  try {
    await useAPI(`/api/organizations/${activeOrganization.value.id}/domains/${domainToDelete.value.id}`, {
      method: 'DELETE',
    })
    toast('Custom domain deleted successfully')
    deleteConfirmOpen.value = false
    domainToDelete.value = null
    await fetchCustomDomains()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to delete domain')
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
          {{ $t('nav.domains') }}
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
      v-if="customDomains.length === 0"
      class="rounded-lg border border-dashed p-8 text-center"
    >
      <Globe class="mx-auto size-8 text-muted-foreground" />
      <h3 class="mt-2 text-sm font-medium">
        {{ isLoading ? $t('common.loading') : 'No custom domains connected' }}
      </h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Connect your branded domain to personalize short link URLs.
      </p>
      <Button class="mt-4" size="sm" @click="addOpen = true">
        Connect Domain
      </Button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="d in customDomains"
        :key="d.id"
        class="rounded-lg border bg-card p-4 transition-colors"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <Globe class="size-5 shrink-0 text-primary" />
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate font-semibold">
                  {{ d.domain }}
                </p>
              </div>
              <div
                class="
                  flex flex-wrap items-center gap-2 pt-1 text-xs
                  text-muted-foreground
                "
              >
                <span>Status:</span>
                <Badge
                  :variant="d.status === 'active' ? 'default' : 'secondary'"
                  class="capitalize"
                >
                  {{ d.status }}
                </Badge>
                <span>• SSL:</span>
                <Badge variant="outline" class="capitalize">
                  {{ d.sslStatus || 'active' }}
                </Badge>
                <template v-if="d.rootRedirectUrl">
                  <span>• Root:</span>
                  <span
                    class="
                      max-w-[150px] truncate font-mono text-xs
                      text-foreground/80
                    "
                  >{{ d.rootRedirectUrl }}</span>
                </template>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="openConfigure(d)"
            >
              <Settings2 class="mr-1.5 size-3.5" />
              Configure
            </Button>
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
              class="
                text-destructive
                hover:text-destructive
              "
              @click="confirmRemoveDomain(d)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>

        <div
          v-if="d.status !== 'active'"
          class="mt-4 rounded-md bg-muted p-3 text-xs"
        >
          <div class="flex items-center justify-between">
            <p class="font-medium text-foreground">
              DNS Configuration Required:
            </p>
            <span class="text-[11px] text-muted-foreground">Add this record in your DNS provider</span>
          </div>
          <div class="mt-2 space-y-1.5 font-mono text-muted-foreground">
            <div
              class="
                flex items-center justify-between rounded-sm bg-background/50
                px-2 py-1
              "
            >
              <span>Type: <strong class="text-foreground">CNAME</strong></span>
              <span>Host: <strong class="text-foreground">{{ d.domain }}</strong></span>
              <div class="flex items-center gap-2">
                <span>Target: <strong class="text-foreground">{{ d.verificationDns?.cnameTarget || defaultCnameTarget }}</strong></span>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-6"
                  @click="copyText(`${d.id}-cname`, d.verificationDns?.cnameTarget || defaultCnameTarget)"
                >
                  <Check
                    v-if="copiedKey === `${d.id}-cname`" class="
                      size-3 text-green-500
                    "
                  />
                  <Copy v-else class="size-3" />
                </Button>
              </div>
            </div>
            <div
              v-if="d.verificationDns?.txtRecordName && d.verificationDns?.txtRecordValue"
              class="
                flex items-center justify-between rounded-sm bg-background/50
                px-2 py-1
              "
            >
              <span>Type: <strong class="text-foreground">TXT</strong></span>
              <span>Name: <strong class="text-foreground">{{ d.verificationDns.txtRecordName }}</strong></span>
              <div class="flex items-center gap-2">
                <span>Value: <strong class="text-foreground">{{ d.verificationDns.txtRecordValue }}</strong></span>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-6"
                  @click="copyText(`${d.id}-txt`, d.verificationDns?.txtRecordValue || '')"
                >
                  <Check
                    v-if="copiedKey === `${d.id}-txt`" class="
                      size-3 text-green-500
                    "
                  />
                  <Copy v-else class="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DashboardSaasAddDomainModal v-model:open="addOpen" @success="fetchCustomDomains()" />
    <DashboardSaasConfigureDomainModal
      v-model:open="configureOpen"
      :domain="domainToConfigure"
      @success="fetchCustomDomains()"
    />

    <!-- Delete Domain Confirmation Dialog -->
    <AlertDialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete custom domain?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong class="text-foreground">{{ domainToDelete?.domain }}</strong>? Any short links using this domain will stop resolving.
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
            @click.prevent="handleRemoveDomain"
          >
            <Loader2
              v-if="isDeleting"
              class="
                mr-1.5 size-4
                motion-safe:animate-spin
              "
            />
            Delete Domain
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
