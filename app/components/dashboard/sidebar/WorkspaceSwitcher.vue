<script setup lang="ts">
import type { Organization } from '#shared/types/saas'
import { Building2, Check, ChevronsUpDown, Plus } from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'
import { useSaaS } from '@/composables/useSaaS'

const { isMobile } = useSidebar()
const { organizations, activeOrganization, switchOrganization, fetchOrganizations } = useSaaS()

const menuOpen = shallowRef(false)
const createOpen = shallowRef(false)

onMounted(() => {
  fetchOrganizations()
})

function handleSelect(org: Organization) {
  switchOrganization(org)
  menuOpen.value = false
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu v-model:open="menuOpen">
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="
              data-[state=open]:bg-sidebar-accent
              data-[state=open]:text-sidebar-accent-foreground
            "
          >
            <div
              class="
                flex aspect-square size-8 items-center justify-center rounded-lg
                bg-primary text-primary-foreground
              "
            >
              <Building2 class="size-4" />
            </div>
            <div class="grid min-w-0 flex-1 text-left text-sm/tight">
              <div class="flex min-w-0 items-center gap-1.5">
                <span class="truncate font-semibold">{{ activeOrganization?.name || 'My Workspace' }}</span>
                <Badge
                  variant="secondary"
                  class="
                    h-4 shrink-0 px-1 text-[9px] font-semibold tracking-wider
                    uppercase
                  "
                >
                  {{ activeOrganization?.plan || 'Free' }}
                </Badge>
              </div>
              <span class="truncate text-xs text-muted-foreground capitalize">
                {{ activeOrganization?.role ? `${activeOrganization.role} access` : 'Personal' }}
              </span>
            </div>
            <ChevronsUpDown aria-hidden="true" class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-60"
          :side="isMobile ? 'bottom' : 'right'"
          align="start"
          :side-offset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="org in organizations"
            :key="org.id"
            class="flex cursor-pointer items-center justify-between gap-2 p-2"
            @select.prevent="handleSelect(org)"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <div
                class="
                  flex size-7 shrink-0 items-center justify-center rounded-md
                  border bg-background text-foreground shadow-xs
                "
              >
                <Building2 class="size-3.5" />
              </div>
              <div class="flex min-w-0 flex-col text-left">
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate text-sm/tight font-medium">{{ org.name }}</span>
                  <Badge
                    variant="outline"
                    class="h-3.5 shrink-0 px-1 text-[8px] font-medium uppercase"
                  >
                    {{ org.plan || 'Free' }}
                  </Badge>
                </div>
                <span
                  v-if="org.role"
                  class="mt-0.5 text-[10px] text-muted-foreground capitalize"
                >
                  {{ org.role }}
                </span>
              </div>
            </div>
            <Check
              v-if="activeOrganization?.id === org.id" class="
                size-4 shrink-0 text-primary
              "
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="gap-2 p-2"
            @select.prevent="createOpen = true"
          >
            <div
              class="
                flex size-6 items-center justify-center rounded-md border
                bg-background
              "
            >
              <Plus class="size-4" />
            </div>
            <span class="font-medium text-muted-foreground">Add Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DashboardSaasWorkspaceCreateModal v-model:open="createOpen" />
    </SidebarMenuItem>
  </SidebarMenu>
</template>
