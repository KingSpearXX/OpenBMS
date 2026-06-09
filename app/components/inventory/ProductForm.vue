<script setup lang="ts">
import type { Category, Product, StockItem } from '~/types/inventory'

const props = defineProps<{
  visible: boolean
  product?: Product | null
  categories: Category[]
  stockItems: StockItem[]
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createProduct, updateProduct } = useInventory()

const isEdit = computed(() => !!props.product)
const loading = ref(false)
const error = ref('')

const form = reactive({
  sku: '' as string,
  name: '' as string,
  description: '' as string,
  unit_price: null as number | null,
  category: null as number | null,
  inventory_id: null as number | null,
})

function relId(value: unknown): number | null {
  if (value == null) return null
  return typeof value === 'object' ? (value as { id: number }).id : Number(value)
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const p = props.product
    form.sku = p?.sku ?? ''
    form.name = p?.name ?? ''
    form.description = p?.description ?? ''
    form.unit_price = p?.unit_price != null ? Number(p.unit_price) : null
    form.category = relId(p?.category)
    form.inventory_id = relId(p?.inventory_id)
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.name.trim()) {
    error.value = 'Name is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      sku: form.sku || null,
      name: form.name.trim(),
      description: form.description || null,
      unit_price: form.unit_price,
      category: form.category,
      inventory_id: form.inventory_id,
    }
    if (isEdit.value && props.product) await updateProduct(props.product.id, body)
    else await createProduct(body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save product.'
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
    :header="isEdit ? 'Edit product' : 'New product'"
    :style="{ width: '32rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Name</label>
        <InputText v-model="form.name" fluid />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">SKU</label>
          <InputText v-model="form.sku" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Unit price</label>
          <InputNumber v-model="form.unit_price" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="5" fluid />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Category</label>
          <Select
            v-model="form.category"
            :options="props.categories"
            option-label="category_name"
            option-value="id"
            show-clear
            placeholder="—"
            fluid
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Linked stock</label>
          <Select
            v-model="form.inventory_id"
            :options="props.stockItems"
            option-label="item_name"
            option-value="id"
            show-clear
            filter
            placeholder="—"
            fluid
          />
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Description</label>
        <Textarea v-model="form.description" rows="3" fluid />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
