<script setup lang="ts">
const sidebarVisible = ref(false)
const collapsed = ref(false)

// Restore the desktop collapsed state (client-only; SSR-safe).
onMounted(() => {
  collapsed.value = localStorage.getItem('obms_sidebar_collapsed') === '1'
})
watch(collapsed, (value) => {
  if (import.meta.client) localStorage.setItem('obms_sidebar_collapsed', value ? '1' : '0')
})
</script>

<template>
  <div class="min-h-screen">
    <AppTopbar @toggle-menu="sidebarVisible = true" />

    <div class="flex">
      <!-- Persistent, sticky, collapsible sidebar on desktop -->
      <aside
        class="hidden lg:flex flex-col shrink-0 border-r border-slate-200 bg-white sticky top-14 h-[calc(100vh-3.5rem)] transition-[width] duration-200"
        :class="collapsed ? 'w-16' : 'w-64'"
      >
        <AppSidebar :collapsed="collapsed" @toggle-collapse="collapsed = !collapsed" />
      </aside>

      <!-- Drawer on mobile (always full width) -->
      <Drawer v-model:visible="sidebarVisible" header="OpenBMS" class="lg:hidden">
        <AppSidebar @navigate="sidebarVisible = false" />
      </Drawer>

      <main class="flex-1 min-w-0 p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
