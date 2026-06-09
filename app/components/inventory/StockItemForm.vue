<script setup lang="ts">
import type { Branch, Category, StockItem } from '~/types/inventory'

const props = defineProps<{
  visible: boolean
  item?: StockItem | null
  categories: Category[]
  branches: Branch[]
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createStockItem, updateStockItem } = useInventory()

const isEdit = computed(() => !!props.item)
const loading = ref(false)
const error = ref('')

const UNITS = ['pcs', 'm', 'cm', 'roll', 'sheet', 'kg', 'g', 'L', 'mL', 'box', 'pack']

const form = reactive({
  item_name: '' as string,
  item_stock_value: null as number | null,
  unit: null as string | null,
  reorder_level: null as number | null,
  item_category: null as number | null,
  location: null as number | string | null,
})

function relId(value: unknown): number | null {
  if (value == null) return null
  return typeof value === 'object' ? (value as { id: number }).id : Number(value)
}
function branchId(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'object' ? String((value as { id: string }).id) : String(value)
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const s = props.item
    form.item_name = s?.item_name ?? ''
    form.item_stock_value = s?.item_stock_value != null ? Number(s.item_stock_value) : null
    form.unit = s?.unit ?? null
    form.reorder_level = s?.reorder_level != null ? Number(s.reorder_level) : null
    form.item_category = relId(s?.item_category)
    form.location = branchId(s?.location)
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.item_name.trim()) {
    error.value = 'Item name is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      item_name: form.item_name.trim(),
      item_stock_value: form.item_stock_value ?? 0,
      unit: form.unit,
      reorder_level: form.reorder_level,
      item_category: form.item_category,
      location: form.location,
    }
    if (isEdit.value && props.item) await updateStockItem(props.item.id, body)
    else await createStockItem(body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save stock item.'
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
    :header="isEdit ? 'Edit stock item' : 'New stock item'"
    :style="{ width: '32rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Item name</label>
        <InputText v-model="form.item_name" fluid />
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">On hand</label>
          <InputNumber v-model="form.item_stock_value" mode="decimal" :max-fraction-digits="3" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Unit</label>
          <Select v-model="form.unit" :options="UNITS" editable show-clear placeholder="—" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Reorder at</label>
          <InputNumber v-model="form.reorder_level" mode="decimal" :max-fraction-digits="5" fluid />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Category</label>
          <Select
            v-model="form.item_category"
            :options="props.categories"
            option-label="category_name"
            option-value="id"
            show-clear
            placeholder="—"
            fluid
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Location</label>
          <Select
            v-model="form.location"
            :options="props.branches"
            option-label="shop_name"
            option-value="id"
            show-clear
            placeholder="—"
            fluid
          />
        </div>
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
