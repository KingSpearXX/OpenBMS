<script setup lang="ts">
import type { StockItem, UsageLog } from '~/types/inventory'

const props = defineProps<{
  visible: boolean
  log?: UsageLog | null
  stockItems: StockItem[]
  lockedItem?: number | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { logUsage, updateUsage } = useInventory()

const isEdit = computed(() => !!props.log)
const loading = ref(false)
const error = ref('')

const form = reactive({
  item: null as number | null,
  used: null as number | null,
})

function relId(value: unknown): number | null {
  if (value == null) return null
  return typeof value === 'object' ? (value as { id: number }).id : Number(value)
}

// Name shown (read-only) when editing or when the item is locked from the caller.
const lockedName = computed(() => {
  const id = isEdit.value ? relId(props.log?.media_item_name) : props.lockedItem
  if (id == null) return null
  return props.stockItems.find(s => s.id === id)?.item_name ?? null
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    if (isEdit.value && props.log) {
      form.item = relId(props.log.media_item_name)
      form.used = props.log.item_usage_value != null ? Number(props.log.item_usage_value) : null
    }
    else {
      form.item = props.lockedItem ?? null
      form.used = null
    }
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.item) {
    error.value = 'Select a stock item.'
    return
  }
  if (form.used == null || form.used <= 0) {
    error.value = 'Used amount must be greater than zero.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (isEdit.value && props.log) await updateUsage(props.log.id, { used: form.used })
    else await logUsage({ item: form.item, used: form.used })
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save usage.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :header="isEdit ? 'Edit usage' : 'Log usage'"
    :style="{ width: '28rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Stock item</label>
        <div v-if="isEdit || props.lockedItem" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {{ lockedName || '—' }}
        </div>
        <Select
          v-else
          v-model="form.item"
          :options="props.stockItems"
          option-label="item_name"
          option-value="id"
          filter
          placeholder="Select an item"
          fluid
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Amount used</label>
        <InputNumber v-model="form.used" mode="decimal" :max-fraction-digits="3" :min="0" fluid />
        <p class="text-xs text-slate-400">Stock is deducted automatically.</p>
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Log usage'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
