<script setup lang="ts">
import type { Supplier } from '~/types/procurement'

const props = defineProps<{
  visible: boolean
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'created', orderId: number): void
}>()

const { createOrder } = useProcurement()
const { listSuppliers } = useSuppliers()

const suppliers = ref<Supplier[]>([])
const suppliersLoading = ref(false)

async function loadSuppliers() {
  suppliersLoading.value = true
  try {
    const { items } = await listSuppliers({ status: 'active' })
    suppliers.value = items
  }
  catch {
    suppliers.value = []
  }
  finally {
    suppliersLoading.value = false
  }
}

const loading = ref(false)
const error = ref('')

const form = reactive({
  supplier: null as number | null,
  order_date: new Date() as Date | null,
  notes: '',
})

watch(
  () => props.visible,
  async (open) => {
    if (!open) return
    error.value = ''
    form.supplier = null
    form.order_date = new Date()
    form.notes = ''
    await loadSuppliers()
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.supplier) {
    error.value = 'Please select a supplier.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const d = form.order_date
    const ymd = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null
    const { item } = await createOrder({
      supplier: form.supplier,
      order_date: ymd,
      notes: form.notes.trim() || null,
    })
    emit('created', (item as { id: number }).id)
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not create order.'
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
    header="New purchase order"
    :style="{ width: '28rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Supplier <span class="text-red-500">*</span></label>
        <Select
          v-model="form.supplier"
          :options="suppliers"
          option-label="name"
          option-value="id"
          :placeholder="suppliersLoading ? 'Loading…' : suppliers.length ? 'Select supplier…' : 'No suppliers — add one first'"
          :loading="suppliersLoading"
          filter
          fluid
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Order date</label>
        <DatePicker v-model="form.order_date" date-format="yy-mm-dd" show-icon fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Notes</label>
        <Textarea v-model="form.notes" rows="2" fluid placeholder="Optional" />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>
    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button label="Create order" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
