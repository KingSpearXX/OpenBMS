<script setup lang="ts">
import type { ProcurementLine, CatalogItem } from '~/types/procurement'

const props = defineProps<{
  visible: boolean
  orderId: number
  line?: ProcurementLine | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { addLine, updateLine, searchCatalog } = useProcurement()

const UNITS = ['pcs', 'sheet', 'roll', 'meter', 'box', 'pack', 'kg', 'liter']

const isEdit = computed(() => !!props.line)
const loading = ref(false)
const error = ref('')

const catalogQuery = ref('')
const catalogSuggestions = ref<CatalogItem[]>([])

async function onSearch(query: string) {
  if (!query.trim()) {
    catalogSuggestions.value = []
    return
  }
  try {
    const { items } = await searchCatalog(query)
    catalogSuggestions.value = items
  }
  catch {
    catalogSuggestions.value = []
  }
}

function onCatalogSelect(item: CatalogItem) {
  form.item_name = item.name
  form.sku = item.sku ?? ''
  form.unit = item.unit ?? ''
  form.unit_cost = item.unit_cost != null ? Number(item.unit_cost) : null
  form.product = item.type === 'product' ? item.id : null
  form.inventory_item = item.type === 'inventory' ? item.id : null
  catalogQuery.value = item.name
}

const form = reactive({
  item_name: '',
  sku: '',
  quantity: null as number | null,
  unit: '',
  unit_cost: null as number | null,
  notes: '',
  product: null as number | null,
  inventory_item: null as number | null,
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    catalogQuery.value = ''
    catalogSuggestions.value = []
    const l = props.line
    form.item_name = l?.item_name ?? ''
    form.sku = l?.sku ?? ''
    form.quantity = l ? Number(l.quantity) : null
    form.unit = l?.unit ?? ''
    form.unit_cost = l?.unit_cost != null ? Number(l.unit_cost) : null
    form.notes = l?.notes ?? ''
    form.product = l?.product ?? null
    form.inventory_item = l?.inventory_item ?? null
    if (l) catalogQuery.value = l.item_name
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
  if (!form.quantity || form.quantity <= 0) {
    error.value = 'Quantity must be greater than zero.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      item_name: form.item_name.trim(),
      sku: form.sku.trim() || null,
      quantity: form.quantity,
      unit: form.unit || null,
      unit_cost: form.unit_cost ?? null,
      notes: form.notes.trim() || null,
      product: form.product,
      inventory_item: form.inventory_item,
    }
    if (isEdit.value && props.line) await updateLine(props.orderId, props.line.id, body)
    else await addLine(props.orderId, body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save line.'
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
    :header="isEdit ? 'Edit line item' : 'Add line item'"
    :style="{ width: '32rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Search catalog</label>
        <AutoComplete
          v-model="catalogQuery"
          :suggestions="catalogSuggestions"
          option-label="name"
          placeholder="Type to search products / stock items…"
          fluid
          force-selection
          @complete="onSearch($event.query)"
          @item-select="onCatalogSelect($event.value)"
        >
          <template #option="{ option }">
            <div class="flex flex-col">
              <span class="text-sm">{{ option.name }}</span>
              <span class="text-xs text-slate-400">{{ option.type === 'product' ? 'Product' : 'Stock item' }}<template v-if="option.sku"> · {{ option.sku }}</template></span>
            </div>
          </template>
        </AutoComplete>
        <p class="text-xs text-slate-400">Selecting fills in the fields below. You can also type manually.</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Item name <span class="text-red-500">*</span></label>
          <InputText v-model="form.item_name" fluid placeholder="e.g. Canon Ink Black" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">SKU</label>
          <InputText v-model="form.sku" fluid placeholder="Optional" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Quantity <span class="text-red-500">*</span></label>
          <InputNumber v-model="form.quantity" :min="0" :max-fraction-digits="3" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Unit</label>
          <Select
            v-model="form.unit"
            :options="UNITS"
            editable
            show-clear
            placeholder="—"
            fluid
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Unit cost</label>
          <InputNumber v-model="form.unit_cost" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" show-clear fluid placeholder="Optional" />
        </div>
        <div class="col-span-2 space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Notes</label>
          <InputText v-model="form.notes" fluid placeholder="Optional" />
        </div>
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>
    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Add'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
