<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  title?: string
  message?: string
  loading?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
}>()

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :header="props.title || 'Delete'"
    :style="{ width: '26rem' }"
    :closable="!props.loading"
    @update:visible="close"
  >
    <p class="text-sm text-slate-600">
      {{ props.message || 'This action cannot be undone. Continue?' }}
    </p>
    <template #footer>
      <Button label="Cancel" text :disabled="props.loading" @click="close" />
      <Button label="Delete" severity="danger" :loading="props.loading" @click="emit('confirm')" />
    </template>
  </Dialog>
</template>
