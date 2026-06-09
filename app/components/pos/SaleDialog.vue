<script setup lang="ts">
import type { Product } from '~/types/inventory'
import type { PosSale } from '~/types/pos'

const props = defineProps<{
  visible: boolean
  sale: PosSale | null
  products: Product[]
  branches: { id: string, shop_name: string }[]
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { updateSale } = usePos()

const loading = ref(false)
const error = ref('')

const form = reactive({
  product_name: '' as string,
  unit_price: null as number | null,
  quantity: 1 as number | null,
  payment_method: 'cash' as string,
  sales_branch: null as string | null,
  sold_at: null as Date | null,
})
const pickedProduct = ref<number | null>(null)

watch(pickedProduct, (id) => {
  if (id == null) return
  const p = props.products.find(x => x.id === id)
  if (!p) return
  form.product_name = p.name ?? ''
  form.unit_price = p.unit_price != null ? Number(p.unit_price) : null
})

function branchId(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'object' ? String((value as { id: string }).id) : String(value)
}

// Wall-clock ISO (no timezone conversion) — sold_at is a Directus dateTime field, so what
// the user picks is what gets stored and displayed.
function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

watch(
  () => props.visible,
  (open) => {
    if (!open || !props.sale) return
    error.value = ''
    const s = props.sale
    pickedProduct.value = s.product != null
      ? (typeof s.product === 'object' ? (s.product as { id: number }).id : Number(s.product))
      : null
    form.product_name = s.product_name ?? ''
    form.unit_price = s.unit_price != null ? Number(s.unit_price) : null
    form.quantity = s.quantity != null ? Number(s.quantity) : 1
    form.payment_method = (s.payment_method as string) ?? 'cash'
    form.sales_branch = branchId(s.sales_branch)
    form.sold_at = s.sold_at ? new Date(s.sold_at) : null
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!props.sale) return
  if (!form.product_name.trim()) {
    error.value = 'Product / description is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await updateSale(props.sale.id, {
      product_name: form.product_name.trim(),
      unit_price: form.unit_price ?? 0,
      quantity: form.quantity ?? 1,
      payment_method: form.payment_method as 'cash' | 'deposit',
      sales_branch: form.sales_branch,
      sold_at: form.sold_at ? localIso(form.sold_at) : null,
      product: pickedProduct.value,
    })
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save sale.'
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
    header="Edit sale"
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
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Price</label>
          <InputNumber v-model="form.unit_price" mode="decimal" :max-fraction-digits="2" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Qty</label>
          <InputNumber v-model="form.quantity" :min="0" :max-fraction-digits="3" fluid />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Payment</label>
          <Select
            v-model="form.payment_method"
            :options="PAYMENT_METHODS"
            option-label="label"
            option-value="value"
            fluid
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Branch</label>
          <Select
            v-model="form.sales_branch"
            :options="props.branches"
            option-label="shop_name"
            option-value="id"
            show-clear
            placeholder="—"
            fluid
          />
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Sale date &amp; time</label>
        <DatePicker v-model="form.sold_at" show-time hour-format="24" date-format="yy-mm-dd" fluid />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button label="Save" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
