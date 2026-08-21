<script setup lang="ts">
import { CreditCard, Globe, Key, ScrollText, User, Users, Webhook } from '@lucide/vue'

interface NavItem {
  title: string
  url: string
  icon: Component
  isActive: boolean
}

const { isActive } = useDashboardRoute()
const route = useRoute()

const platformItems = computed<NavItem[]>(() => [
  {
    title: 'nav.links',
    url: '/dashboard/links',
    icon: DASHBOARD_ROUTES.links.icon,
    isActive: isActive('links'),
  },
  {
    title: 'nav.analysis',
    url: '/dashboard/analysis',
    icon: DASHBOARD_ROUTES.analysis.icon,
    isActive: isActive('analysis'),
  },
  {
    title: 'nav.realtime',
    url: '/dashboard/realtime',
    icon: DASHBOARD_ROUTES.realtime.icon,
    isActive: isActive('realtime'),
  },
  {
    title: 'nav.check',
    url: '/dashboard/check',
    icon: DASHBOARD_ROUTES.check.icon,
    isActive: isActive('check'),
  },
])

const settingsItems = computed<NavItem[]>(() => [
  {
    title: 'Account Profile',
    url: '/dashboard/settings/profile',
    icon: User,
    isActive: route.path === '/dashboard/settings/profile',
  },
  {
    title: 'Team Members',
    url: '/dashboard/settings/team',
    icon: Users,
    isActive: route.path === '/dashboard/settings/team',
  },
  {
    title: 'Custom Domains',
    url: '/dashboard/settings/domains',
    icon: Globe,
    isActive: route.path === '/dashboard/settings/domains',
  },
  {
    title: 'API Keys',
    url: '/dashboard/settings/api-keys',
    icon: Key,
    isActive: route.path === '/dashboard/settings/api-keys',
  },
  {
    title: 'Webhooks',
    url: '/dashboard/settings/webhooks',
    icon: Webhook,
    isActive: route.path === '/dashboard/settings/webhooks',
  },
  {
    title: 'Audit Logs',
    url: '/dashboard/settings/audit-logs',
    icon: ScrollText,
    isActive: route.path === '/dashboard/settings/audit-logs',
  },
  {
    title: 'Billing & Plans',
    url: '/dashboard/settings/billing',
    icon: CreditCard,
    isActive: route.path === '/dashboard/settings/billing',
  },
  {
    title: 'nav.migrate',
    url: '/dashboard/migrate',
    icon: DASHBOARD_ROUTES.migrate.icon,
    isActive: isActive('migrate'),
  },
])
</script>

<template>
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader>
      <DashboardSidebarWorkspaceSwitcher />
    </SidebarHeader>
    <SidebarContent>
      <DashboardSidebarNavMain :platform-items="platformItems" :settings-items="settingsItems" />
      <DashboardSidebarNavSecondary class="mt-auto" />
    </SidebarContent>
    <SidebarFooter>
      <DashboardSidebarNavUser />
    </SidebarFooter>
  </Sidebar>
</template>
