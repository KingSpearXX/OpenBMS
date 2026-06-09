<script setup lang="ts">
const props = defineProps<{ collapsed?: boolean }>()
defineEmits<{ (e: 'navigate' | 'toggle-collapse'): void }>()

const version = useRuntimeConfig().public.appVersion

const nav = [
  { label: 'Dashboard', icon: 'pi pi-home', to: '/' },
  { label: 'Stock items', icon: 'pi pi-box', to: '/inventory' },
  { label: 'Products', icon: 'pi pi-tags', to: '/inventory/products' },
  { label: 'Stock usage', icon: 'pi pi-chart-line', to: '/inventory/usage' },
  { label: 'Customers', icon: 'pi pi-users', to: '/customers' },
  { label: 'Point of Sale', icon: 'pi pi-shopping-bag', to: '/pos' },
  { label: 'Sales history', icon: 'pi pi-receipt', to: '/pos/history' },
  { label: 'Security', icon: 'pi pi-shield', to: '/settings/security' },
]
</script>

<template>
  <div class="flex h-full flex-col">
    <nav class="flex-1 overflow-y-auto p-3">
      <ul class="space-y-1">
        <li v-for="item in nav" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100"
            :class="props.collapsed ? 'justify-center' : 'gap-2'"
            :title="props.collapsed ? item.label : undefined"
            active-class="bg-slate-100 text-slate-900 font-medium"
            @click="$emit('navigate')"
          >
            <i :class="item.icon" />
            <span v-if="!props.collapsed">{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="mt-auto border-t border-slate-200 p-3">
      <!-- Collapse toggle: desktop only -->
      <button
        type="button"
        class="hidden lg:flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        :title="props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="$emit('toggle-collapse')"
      >
        <i :class="props.collapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'" />
        <span v-if="!props.collapsed">Collapse</span>
      </button>

      <p
        class="mt-1 text-center text-xs text-slate-400"
        :title="`OpenBMS v${version}`"
      >
        <span v-if="!props.collapsed">OpenBMS&nbsp;</span>v{{ version }}
      </p>
    </div>
  </div>
</template>
