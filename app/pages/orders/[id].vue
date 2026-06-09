<script setup lang="ts">
import type { Product } from '~/types/inventory'
import type { Customer, Employee, Order, OrderLine } from '~/types/sales'

const route = useRoute()
const id = Number(route.params.id)

const { data: orderData, error, refresh: refreshOrder } = await useFetch<{ item: Order }>(`/api/orders/${id}`)
const { data: linesData, refresh: refreshLines } = await useFetch<{ items: OrderLine[] }>(`/api/orders/${id}/lines`)
const { data: custData } = await useFetch<{ items: Customer[] }>('/api/customers')
const { data: empData } = await useFetch<{ items: Employee[] }>('/api/orders/employees')
const { data: prodData } = await useFetch<{ items: Product[] }>('/api/inventory/products')

const order = computed(() => orderData.value?.item ?? null)
const lines = computed(() => linesData.value?.items ?? [])
const customers = computed(() => custData.value?.items ?? [])
const employees = computed(() => empData.value?.items ?? [])
const products = computed(() => prodData.value?.items ?? [])

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
const customerName = computed(() =>
  order.value && typeof order.value.partner_id === 'object' && order.value.partner_id
    ? order.value.partner_id.partner_name
    : '—',
)
const customerId = computed(() =>
  order.value && typeof order.value.partner_id === 'object' && order.value.partner_id
    ? order.value.partner_id.id
    : (typeof order.value?.partner_id === 'number' ? order.value.partner_id : null),
)
const employeeName = computed(() => {
  const sid = order.value?.sales_employee
  if (!sid || typeof sid === 'object') return typeof sid === 'object' ? sid?.name ?? '—' : '—'
  return employees.value.find(e => e.id === sid)?.name ?? '—'
})

const { updateOrder } = useSales()

// Quick status toggles — patch immediately.
const togglingStatus = ref(false)
async function setStatus(field: 'paid' | 'shipped' | 'completed', value: boolean) {
  togglingStatus.value = true
  try {
    await updateOrder(id, { [field]: value })
    await refreshOrder()
  }
  finally {
    togglingStatus.value = false
  }
}

// Edit order header
const editVisible = ref(false)

// Line items
const lineVisible = ref(false)
const editingLine = ref<OrderLine | null>(null)
function addLine() {
  editingLine.value = null
  lineVisible.value = true
}
function editLine(l: OrderLine) {
  editingLine.value = l
  lineVisible.value = true
}
async function afterLineChange() {
  await Promise.all([refreshLines(), refreshOrder()])
}

const { deleteLine } = useSales()
const lDeleteVisible = ref(false)
const lDeleting = ref<OrderLine | null>(null)
const lDeleteLoading = ref(false)
function askDeleteLine(l: OrderLine) {
  lDeleting.value = l
  lDeleteVisible.value = true
}
async function confirmDeleteLine() {
  if (!lDeleting.value) return
  lDeleteLoading.value = true
  try {
    await deleteLine(lDeleting.value.id)
    lDeleteVisible.value = false
    await afterLineChange()
  }
  finally {
    lDeleteLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink
      :to="customerId ? `/customers/${customerId}` : '/customers'"
      class="text-sm text-slate-500 hover:underline"
    >← {{ customerName && customerName !== '—' ? customerName : 'Customer' }}</NuxtLink>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load this order.</Message>

    <div v-else-if="order" class="mt-3">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-slate-900">Order #{{ order.id }}</h1>
        <Button icon="pi pi-pencil" label="Edit" outlined size="small" class="ml-auto" @click="editVisible = true" />
      </div>

      <dl class="mt-6 grid grid-cols-3 gap-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dt class="text-slate-500">Customer</dt>
        <dd class="col-span-2 text-slate-900">{{ customerName || '—' }}</dd>
        <dt class="text-slate-500">Sales employee</dt>
        <dd class="col-span-2 text-slate-900">{{ employeeName }}</dd>
        <dt class="text-slate-500">Date</dt>
        <dd class="col-span-2 text-slate-900">{{ order.order_date ? formatDate(order.order_date) : '—' }}</dd>
        <dt class="text-slate-500">Tax</dt>
        <dd class="col-span-2 text-slate-900">{{ money(order.tax) }}</dd>
        <dt class="text-slate-500">Discount</dt>
        <dd class="col-span-2 text-slate-900">{{ order.discount || '—' }}</dd>
        <dt class="text-slate-500">Downpayment</dt>
        <dd class="col-span-2 text-slate-900">{{ money(order.downpayment) }}</dd>
        <dt class="text-slate-500">Shipping</dt>
        <dd class="col-span-2 text-slate-900">{{ order.shipping_address || '—' }}</dd>
        <dt class="text-slate-500">Remarks</dt>
        <dd class="col-span-2 text-slate-900">{{ order.remarks || '—' }}</dd>
        <dt class="text-slate-500">Total</dt>
        <dd class="col-span-2 text-base font-semibold text-slate-900">{{ money(order.total) }}</dd>
      </dl>

      <!-- Status toggles -->
      <div class="mt-4 flex flex-wrap gap-5 rounded-lg border border-slate-200 bg-white p-4">
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <ToggleSwitch :model-value="!!order.paid" :disabled="togglingStatus" @update:model-value="setStatus('paid', $event)" /> Paid
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <ToggleSwitch :model-value="!!order.shipped" :disabled="togglingStatus" @update:model-value="setStatus('shipped', $event)" /> Shipped
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <ToggleSwitch :model-value="!!order.completed" :disabled="togglingStatus" @update:model-value="setStatus('completed', $event)" /> Completed
        </label>
      </div>

      <!-- Line items -->
      <div class="mt-8 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-900">Line items</h2>
        <Button icon="pi pi-plus" label="Add line" text size="small" @click="addLine" />
      </div>
      <div class="mt-3 overflow-x-auto">
        <DataTable
          :value="lines"
          data-key="id"
          striped-rows
          paginator
          :rows="10"
          :rows-per-page-options="[10, 25, 50]"
          :paginator-template="{
            '640px': 'PrevPageLink CurrentPageReport NextPageLink',
            '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
            default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
          }"
          current-page-report-template="{currentPage} / {totalPages}"
          :pt="{ table: { class: 'min-w-[40rem]' } }"
        >
          <template #empty><span class="text-sm text-slate-500">No line items yet.</span></template>
          <Column field="product_name" header="Product" />
          <Column header="Qty">
            <template #body="{ data: row }">{{ row.quantity != null ? Number(row.quantity) : '—' }}</template>
          </Column>
          <Column header="Unit price">
            <template #body="{ data: row }">{{ money(row.unit_price) }}</template>
          </Column>
          <Column header="Discount">
            <template #body="{ data: row }">{{ money(row.discount) }}</template>
          </Column>
          <Column header="Line total">
            <template #body="{ data: row }">{{ money(row.line_total) }}</template>
          </Column>
          <Column header="" class="w-24">
            <template #body="{ data: row }">
              <div class="flex justify-end gap-1">
                <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" @click="editLine(row)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Delete" @click="askDeleteLine(row)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <SalesOrderForm
        v-model:visible="editVisible"
        :order="order"
        :customers="customers"
        :employees="employees"
        @saved="() => refreshOrder()"
      />
      <SalesOrderLineDialog
        v-model:visible="lineVisible"
        :order-id="id"
        :line="editingLine"
        :products="products"
        @saved="afterLineChange"
      />
      <UiConfirmDelete
        v-model:visible="lDeleteVisible"
        title="Delete line item"
        :message="lDeleting ? `Delete “${lDeleting.product_name || 'this line'}”?` : ''"
        :loading="lDeleteLoading"
        @confirm="confirmDeleteLine"
      />
    </div>
  </div>
</template>
