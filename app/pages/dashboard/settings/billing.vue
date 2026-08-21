<script setup lang="ts">
import { Check, CreditCard } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'dashboard',
})

const { activeOrganization } = useSaaS()
const quotaData = ref<any>(null)
const upgrading = ref<string | null>(null)
const openingPortal = ref(false)

async function fetchUsage() {
  if (!activeOrganization.value?.id)
    return
  try {
    const data = await useAPI(`/api/organizations/${activeOrganization.value.id}/billing/usage`)
    quotaData.value = data
  }
  catch (err: any) {
    console.error('Failed to fetch billing usage:', err)
  }
}

onMounted(() => {
  fetchUsage()
})

watch(activeOrganization, () => {
  fetchUsage()
})

async function handleUpgrade(plan: string) {
  if (!activeOrganization.value?.id)
    return
  upgrading.value = plan
  try {
    const res = await useAPI<{ url: string }>(`/api/organizations/${activeOrganization.value.id}/billing/checkout`, {
      method: 'POST',
      body: {
        plan,
        returnUrl: window.location.href,
      },
    })
    if (res.url) {
      window.location.assign(res.url)
    }
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to start upgrade session')
  }
  finally {
    upgrading.value = null
  }
}

async function handleOpenPortal() {
  if (!activeOrganization.value?.id)
    return
  openingPortal.value = true
  try {
    const res = await useAPI<{ url: string }>(`/api/organizations/${activeOrganization.value.id}/billing/portal`, {
      method: 'POST',
      body: {
        returnUrl: window.location.href,
      },
    })
    if (res.url) {
      window.location.assign(res.url)
    }
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to open billing portal')
  }
  finally {
    openingPortal.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Billing & Subscription
        </h2>
        <p class="text-sm text-muted-foreground">
          Manage workspace plan, usage quotas, and invoices.
        </p>
      </div>
      <Button
        v-if="quotaData?.plan !== 'free'"
        variant="outline"
        :disabled="openingPortal"
        @click="handleOpenPortal"
      >
        <CreditCard class="mr-2 size-4" />
        Manage Subscription
      </Button>
    </div>

    <!-- Current Plan & Quotas -->
    <div
      class="
        grid gap-4
        md:grid-cols-3
      "
    >
      <div class="rounded-lg border bg-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-muted-foreground">Active Links</span>
          <span class="text-xs font-semibold text-primary uppercase">
            {{ Math.round(((quotaData?.usage?.links || 0) / (quotaData?.limits?.linksQuota || 1)) * 100) }}%
          </span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-bold">{{ quotaData?.usage?.links || 0 }}</span>
          <span class="text-xs text-muted-foreground">/ {{ quotaData?.limits?.linksQuota || 100 }}</span>
        </div>
      </div>

      <div class="rounded-lg border bg-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-muted-foreground">Custom Domains</span>
          <span class="text-xs font-semibold text-primary uppercase">
            {{ quotaData?.usage?.domains || 0 }} / {{ quotaData?.limits?.customDomainsQuota || 0 }}
          </span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-bold">{{ quotaData?.usage?.domains || 0 }}</span>
          <span class="text-xs text-muted-foreground">/ {{ quotaData?.limits?.customDomainsQuota || 0 }}</span>
        </div>
      </div>

      <div class="rounded-lg border bg-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-muted-foreground">Team Seats</span>
          <span class="text-xs font-semibold text-primary uppercase">
            {{ quotaData?.usage?.members || 0 }} / {{ quotaData?.limits?.teamSeatsQuota || 1 }}
          </span>
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-bold">{{ quotaData?.usage?.members || 0 }}</span>
          <span class="text-xs text-muted-foreground">/ {{ quotaData?.limits?.teamSeatsQuota || 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Upgrade Plans -->
    <div>
      <h3 class="mb-4 text-lg font-semibold">
        Available Plans
      </h3>
      <div
        class="
          grid gap-6
          md:grid-cols-3
        "
      >
        <!-- Starter Plan -->
        <div
          class="
            flex flex-col justify-between rounded-xl border bg-card p-6
            shadow-xs
          "
          :class="{ 'border-primary ring-1 ring-primary': quotaData?.plan === 'starter' }"
        >
          <div>
            <div class="flex items-center justify-between">
              <h4 class="font-bold">
                Starter
              </h4>
              <Badge v-if="quotaData?.plan === 'starter'" variant="default">
                Current
              </Badge>
            </div>
            <div class="mt-4 flex items-baseline gap-1">
              <span class="text-3xl font-extrabold">$19</span>
              <span class="text-sm text-muted-foreground">/month</span>
            </div>
            <ul class="mt-6 space-y-2.5 text-xs text-muted-foreground">
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                2,500 active short links
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                2 branded custom domains
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                3 team members
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                90 days analytics history
              </li>
            </ul>
          </div>
          <Button
            class="mt-6 w-full"
            variant="outline"
            :disabled="quotaData?.plan === 'starter' || upgrading === 'starter'"
            @click="handleUpgrade('starter')"
          >
            {{ quotaData?.plan === 'starter' ? 'Active Plan' : 'Upgrade to Starter' }}
          </Button>
        </div>

        <!-- Pro Plan -->
        <div
          class="
            relative flex flex-col justify-between rounded-xl border
            border-primary bg-card p-6 shadow-md
          "
        >
          <div
            class="
              absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary
              px-3 py-0.5 text-[10px] font-semibold text-primary-foreground
            "
          >
            MOST POPULAR
          </div>
          <div>
            <div class="flex items-center justify-between">
              <h4 class="font-bold">
                Pro
              </h4>
              <Badge v-if="quotaData?.plan === 'pro'" variant="default">
                Current
              </Badge>
            </div>
            <div class="mt-4 flex items-baseline gap-1">
              <span class="text-3xl font-extrabold">$49</span>
              <span class="text-sm text-muted-foreground">/month</span>
            </div>
            <ul class="mt-6 space-y-2.5 text-xs text-muted-foreground">
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                25,000 active short links
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                10 branded custom domains
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                10 team members
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                365 days analytics history
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                Priority support & webhooks
              </li>
            </ul>
          </div>
          <Button
            class="mt-6 w-full"
            :disabled="quotaData?.plan === 'pro' || upgrading === 'pro'"
            @click="handleUpgrade('pro')"
          >
            {{ quotaData?.plan === 'pro' ? 'Active Plan' : 'Upgrade to Pro' }}
          </Button>
        </div>

        <!-- Enterprise Plan -->
        <div
          class="
            flex flex-col justify-between rounded-xl border bg-card p-6
            shadow-xs
          "
          :class="{ 'border-primary ring-1 ring-primary': quotaData?.plan === 'enterprise' }"
        >
          <div>
            <div class="flex items-center justify-between">
              <h4 class="font-bold">
                Enterprise
              </h4>
              <Badge v-if="quotaData?.plan === 'enterprise'" variant="default">
                Current
              </Badge>
            </div>
            <div class="mt-4 flex items-baseline gap-1">
              <span class="text-3xl font-extrabold">$199</span>
              <span class="text-sm text-muted-foreground">/month</span>
            </div>
            <ul class="mt-6 space-y-2.5 text-xs text-muted-foreground">
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                1,000,000 active short links
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                100 branded custom domains
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                100 team seats
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                3 years analytics history
              </li>
              <li class="flex items-center gap-2">
                <Check class="size-4 text-emerald-500" />
                Dedicated SLA & SSO
              </li>
            </ul>
          </div>
          <Button
            class="mt-6 w-full"
            variant="outline"
            :disabled="quotaData?.plan === 'enterprise' || upgrading === 'enterprise'"
            @click="handleUpgrade('enterprise')"
          >
            {{ quotaData?.plan === 'enterprise' ? 'Active Plan' : 'Upgrade to Enterprise' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
