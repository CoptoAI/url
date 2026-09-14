<script setup lang="ts">
interface NavItem {
  title: string
  url: string
  icon: Component
  isActive: boolean
}

const { isActive } = useDashboardRoute()

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
    title: DASHBOARD_ROUTES.profile.titleKey,
    url: DASHBOARD_ROUTES.profile.paths[0]!,
    icon: DASHBOARD_ROUTES.profile.icon,
    isActive: isActive('profile'),
  },
  {
    title: DASHBOARD_ROUTES.team.titleKey,
    url: DASHBOARD_ROUTES.team.paths[0]!,
    icon: DASHBOARD_ROUTES.team.icon,
    isActive: isActive('team'),
  },
  {
    title: DASHBOARD_ROUTES.domains.titleKey,
    url: DASHBOARD_ROUTES.domains.paths[0]!,
    icon: DASHBOARD_ROUTES.domains.icon,
    isActive: isActive('domains'),
  },
  {
    title: DASHBOARD_ROUTES.apiKeys.titleKey,
    url: DASHBOARD_ROUTES.apiKeys.paths[0]!,
    icon: DASHBOARD_ROUTES.apiKeys.icon,
    isActive: isActive('apiKeys'),
  },
  {
    title: DASHBOARD_ROUTES.webhooks.titleKey,
    url: DASHBOARD_ROUTES.webhooks.paths[0]!,
    icon: DASHBOARD_ROUTES.webhooks.icon,
    isActive: isActive('webhooks'),
  },
  {
    title: DASHBOARD_ROUTES.auditLogs.titleKey,
    url: DASHBOARD_ROUTES.auditLogs.paths[0]!,
    icon: DASHBOARD_ROUTES.auditLogs.icon,
    isActive: isActive('auditLogs'),
  },
  {
    title: DASHBOARD_ROUTES.billing.titleKey,
    url: DASHBOARD_ROUTES.billing.paths[0]!,
    icon: DASHBOARD_ROUTES.billing.icon,
    isActive: isActive('billing'),
  },
  {
    title: DASHBOARD_ROUTES.migrate.titleKey,
    url: DASHBOARD_ROUTES.migrate.paths[0]!,
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
