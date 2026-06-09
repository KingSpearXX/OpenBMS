<script setup lang="ts">
defineEmits<{ (e: 'toggle-menu'): void }>()

const { user, logout, lock } = useAuth()
const { isEnabled: pinEnabled } = usePin()
</script>

<template>
  <header
    class="h-14 flex items-center gap-3 px-4 border-b border-slate-200 bg-white sticky top-0 z-10"
  >
    <Button
      icon="pi pi-bars"
      text
      rounded
      class="lg:hidden"
      aria-label="Open menu"
      @click="$emit('toggle-menu')"
    />
    <span class="font-semibold tracking-tight text-slate-900">OpenBMS</span>

    <div class="ml-auto flex items-center gap-2">
      <span v-if="user" class="hidden sm:inline text-sm text-slate-600">{{ user.email }}</span>
      <Button
        icon="pi pi-lock"
        text
        rounded
        :disabled="!pinEnabled"
        aria-label="Lock"
        :title="pinEnabled ? 'Lock' : 'Set up a PIN to lock'"
        @click="lock"
      />
      <Button
        icon="pi pi-sign-out"
        text
        rounded
        aria-label="Sign out"
        title="Sign out"
        @click="logout"
      />
    </div>
  </header>
</template>
