<script setup lang="ts">
const props = defineProps<{ length?: number, loading?: boolean }>()
const emit = defineEmits<{ (e: 'complete', pin: string): void }>()

const model = ref('')
const length = computed(() => props.length ?? 6)

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  // Keep digits only, capped at length.
  const digits = el.value.replace(/\D/g, '').slice(0, length.value)
  model.value = digits
  el.value = digits
  if (digits.length === length.value) emit('complete', digits)
}

function clear() {
  model.value = ''
}

defineExpose({ clear })
</script>

<template>
  <input
    :value="model"
    type="password"
    inputmode="numeric"
    autocomplete="off"
    :maxlength="length"
    :disabled="loading"
    class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-2xl tracking-[0.5em] text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-60"
    @input="onInput"
  >
</template>
