<script setup lang="ts">
import type { Customer, Employee, Order } from '~/types/sales'

const props = defineProps<{
  visible: boolean
  order?: Order | null
  customers: Customer[]
  employees: Employee[]
  // When set, the order is bound to this customer and the picker is hidden.
  lockedCustomer?: number | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved', id: number): void
}>()

const { createOrder, updateOrder } = useSales()
const { user } = useAuth()

const isEdit = computed(() => !!props.order)
const loading = ref(false)
const error = ref('')

const form = reactive({
  partner_id: null as number | null,
  sales_employee: null as string | null,
  tax: null as number | null,
  discount: '' as string,
  downpayment: null as number | null,
  shipping_address: '' as string,
  remarks: '' as string,
  paid: false,
  shipped: false,
  completed: false,
})

function relId(value: unknown): number | null {
  if (value == null) return null
  return typeof value === 'object' ? (value as { id: number }).id : Number(value)
}
function empId(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'object' ? String((value as { id: string }).id) : String(value)
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const o = props.order
    form.partner_id = props.lockedCustomer ?? relId(o?.partner_id)
    form.sales_employee = o ? empId(o.sales_employee) : (user.value?.id ?? null)
    form.tax = o?.tax != null ? Number(o.tax) : null
    form.discount = o?.discount ?? ''
    form.downpayment = o?.downpayment != null ? Number(o.downpayment) : null
    form.shipping_address = o?.shipping_address ?? ''
    form.remarks = o?.remarks ?? ''
    form.paid = o?.paid ?? false
    form.shipped = o?.shipped ?? false
    form.completed = o?.completed ?? false
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.partner_id) {
    error.value = 'Select a customer.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      partner_id: form.partner_id,
      sales_employee: form.sales_employee,
      tax: form.tax,
      discount: form.discount || null,
      downpayment: form.downpayment,
      shipping_address: form.shipping_address || null,
      remarks: form.remarks || null,
      paid: form.paid,
      shipped: form.shipped,
      completed: form.completed,
    }
    if (isEdit.value && props.order) {
      await updateOrder(props.order.id, body)
      emit('saved', props.order.id)
    }
    else {
      const res = await createOrder(body)
      emit('saved', res.item.id)
    }
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save order.'
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
    :header="isEdit ? `Edit order #${props.order?.id}` : 'New order'"
    :style="{ width: '34rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Customer</label>
          <div v-if="props.lockedCustomer != null" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {{ props.customers.find(c => c.id === props.lockedCustomer)?.partner_name || '—' }}
          </div>
          <Select
            v-else
            v-model="form.partner_id"
            :options="props.customers"
            option-label="partner_name"
            option-value="id"
            filter
            placeholder="Select a customer"
            fluid
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Sales employee</label>
          <Select
            v-model="form.sales_employee"
            :options="props.employees"
            option-label="name"
            option-value="id"
            show-clear
            filter
            placeholder="—"
            fluid
          />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Tax</label>
          <InputNumber v-model="form.tax" mode="decimal" :max-fraction-digits="2" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Discount</label>
          <InputText v-model="form.discount" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Downpayment</label>
          <InputNumber v-model="form.downpayment" mode="decimal" :max-fraction-digits="2" fluid />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Shipping address</label>
        <Textarea v-model="form.shipping_address" rows="2" fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Remarks</label>
        <Textarea v-model="form.remarks" rows="2" fluid />
      </div>

      <div class="flex flex-wrap gap-5">
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox v-model="form.paid" binary /> Paid
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox v-model="form.shipped" binary /> Shipped
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox v-model="form.completed" binary /> Completed
        </label>
      </div>

      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
