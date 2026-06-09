<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <span class="text-lg font-semibold tracking-tight text-slate-900">OpenBMS</span>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <slot />
      </div>
    </div>
  </div>
</template>
