<script setup lang="ts">
import type { Product } from '~/types/inventory'
import type { OrderLine } from '~/types/sales'

const props = defineProps<{
  visible: boolean
  orderId: number
  line?: OrderLine | null
  products: Product[]
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createLine, updateLine } = useSales()

const isEdit = computed(() => !!props.line)
const loading = ref(false)
const error = ref('')

const form = reactive({
  product_name: '' as string,
  quantity: 1 as number | null,
  unit_price: null as number | null,
  discount: null as number | null,
})
const pickedProduct = ref<number | null>(null)

// Snapshot name + unit price from the catalog when a product is picked.
watch(pickedProduct, (id) => {
  if (id == null) return
  const p = props.products.find(x => x.id === id)
  if (!p) return
  form.product_name = p.name ?? ''
  form.unit_price = p.unit_price != null ? Number(p.unit_price) : null
})

const lineTotal = computed(() => {
  const qty = Number(form.quantity) || 0
  const price = Number(form.unit_price) || 0
  const disc = Number(form.discount) || 0
  return Math.round((qty * price - disc) * 100) / 100
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const l = props.line
    pickedProduct.value = l?.product != null
      ? (typeof l.product === 'object' ? (l.product as { id: number }).id : Number(l.product))
      : null
    form.product_name = l?.product_name ?? ''
    form.quantity = l?.quantity != null ? Number(l.quantity) : 1
    form.unit_price = l?.unit_price != null ? Number(l.unit_price) : null
    form.discount = l?.discount != null ? Number(l.discount) : null
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.product_name.trim()) {
    error.value = 'Product / description is required.'
    return
  }
  if (form.quantity == null || form.quantity <= 0) {
    error.value = 'Quantity must be greater than zero.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      product_name: form.product_name.trim(),
      quantity: form.quantity,
      unit_price: form.unit_price ?? 0,
      discount: form.discount ?? 0,
      product: pickedProduct.value,
    }
    if (isEdit.value && props.line) await updateLine(props.line.id, body)
    else await createLine(props.orderId, body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save line item.'
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
    :style="{ width: '30rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Pick from catalog</label>
        <Select
          v-model="pickedProduct"
          :options="props.products"
          option-label="name"
          option-value="id"
          show-clear
          filter
          placeholder="Optional — fills name & price"
          fluid
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Product / description</label>
        <InputText v-model="form.product_name" fluid />
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Qty</label>
          <InputNumber v-model="form.quantity" :min="0" :max-fraction-digits="2" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Unit price</label>
          <InputNumber v-model="form.unit_price" mode="decimal" :max-fraction-digits="2" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Discount</label>
          <InputNumber v-model="form.discount" mode="decimal" :max-fraction-digits="2" fluid />
        </div>
      </div>
      <p class="text-sm text-slate-600">Line total: <span class="font-medium text-slate-900">{{ formatCurrency(lineTotal) }}</span></p>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Add'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
