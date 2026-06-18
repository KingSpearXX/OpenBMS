<script setup lang="ts">
import type { QuoteLine } from '~/types/quotes'
import type { Product } from '~/types/inventory'

const props = defineProps<{
  visible: boolean
  quoteId: string
  line?: QuoteLine | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const isEdit = computed(() => !!props.line)
const loading = ref(false)
const error = ref('')

// Fetch products for the product selector
const { data: productsData } = useFetch<{ items: Product[] }>('/api/inventory/products')
const products = computed(() => productsData.value?.items ?? [])

async function saveLine(data: Record<string, unknown>) {
  loading.value = true
  error.value = ''
  try {
    if (isEdit.value && props.line) {
      await $fetch(`/api/quotes/${props.quoteId}/lines/${props.line.id}`, {
        method: 'PATCH',
        body: data,
      })
    } else {
      await $fetch(`/api/quotes/${props.quoteId}/lines`, {
        method: 'POST',
        body: data,
      })
    }
    emit('saved')
    emit('update:visible', false)
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Failed to save line.'
  } finally {
    loading.value = false
  }
}

const lineTypes = [
  { label: 'Product', value: 'product' },
  { label: 'Free text', value: 'free_text' },
]

const form = reactive({
  line_type: 'product' as 'product' | 'free_text',
  product: null as number | null,
  description: '',
  quantity: null as number | null,
  unit_price: null as number | null,
  discount_percent: null as number | null,
  tax_percent: null as number | null,
})

// Auto-fill description and unit_price when a product is selected
watch(
  () => form.product,
  (productId) => {
    if (!productId) return
    const product = products.value.find((p) => p.id === productId)
    if (!product) return
    form.description = product.description ?? product.name ?? ''
    form.unit_price = Number(product.unit_price) || null
  },
)

// Auto-calc amount
const lineAmount = computed(() => {
  const qty = Number(form.quantity) || 0
  const price = Number(form.unit_price) || 0
  const discountPct = Number(form.discount_percent) || 0
  const taxPct = Number(form.tax_percent) || 0

  let subtotal = qty * price
  const discountAmt = subtotal * (discountPct / 100)
  subtotal -= discountAmt
  const taxAmt = subtotal * (taxPct / 100)
  return subtotal + taxAmt
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const l = props.line
    form.line_type = l?.line_type ?? 'product'
    form.product = l?.product ?? null
    form.description = l?.description ?? ''
    form.quantity = l ? Number(l.quantity) : null
    form.unit_price = l ? Number(l.unit_price) : null
    form.discount_percent = l ? Number(l.discount_percent) : null
    form.tax_percent = l ? Number(l.tax_percent) : null
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  loading.value = true
  error.value = ''
  try {
    const body = {
      line_type: form.line_type,
      product: form.product,
      description: form.description.trim() || null,
      quantity: form.quantity,
      unit_price: form.unit_price,
      discount_percent: form.discount_percent,
      tax_percent: form.tax_percent,
      amount: Math.round(lineAmount.value * 100) / 100,
    }
    if (isEdit.value && props.line) {
      await $fetch(`/api/quotes/${props.quoteId}/lines/${props.line.id}`, {
        method: 'PATCH',
        body,
      })
    } else {
      await $fetch(`/api/quotes/${props.quoteId}/lines`, {
        method: 'POST',
        body,
      })
    }
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
    :style="{ width: '34rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Line type <span class="text-red-500">*</span></label>
        <SelectButton v-model="form.line_type" :options="lineTypes" option-label="label" option-value="value" :allow-empty="false" />
      </div>

      <div v-if="form.line_type === 'product'" class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Product</label>
        <Select
          v-model="form.product"
          :options="products"
          option-label="name"
          option-value="id"
          filter
          filter-placeholder="Search products..."
          :show-clear="true"
          placeholder="Select a product"
          fluid
        >
          <template #option="slotProps">
            <div class="flex items-center justify-between gap-4">
              <span>{{ slotProps.option.name }}</span>
              <span v-if="slotProps.option.unit_price != null" class="text-sm text-slate-400">
                {{ formatCurrency(Number(slotProps.option.unit_price)) }}
              </span>
            </div>
          </template>
        </Select>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Description</label>
        <Textarea v-model="form.description" rows="2" fluid placeholder="Item / service description" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Quantity</label>
          <InputNumber v-model="form.quantity" :min="0" :max-fraction-digits="2" fluid placeholder="0" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Unit price</label>
          <InputNumber v-model="form.unit_price" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" fluid placeholder="0.00" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Discount %</label>
          <InputNumber v-model="form.discount_percent" :min="0" :max="100" :max-fraction-digits="1" fluid placeholder="0" suffix="%" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Tax %</label>
          <InputNumber v-model="form.tax_percent" :min="0" :max="100" :max-fraction-digits="1" fluid placeholder="0" suffix="%" />
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <span class="text-slate-500">Line amount</span>
        <span class="ml-4 font-semibold text-slate-900">{{ formatCurrency(lineAmount) }}</span>
      </div>

      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>
    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Add'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
