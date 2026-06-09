<script setup lang="ts">
import type { Branch, StockItem } from '~/types/inventory'
import type { Order } from '~/types/sales'

const { data, pending, error } = await useFetch<{ items: Order[] }>('/api/orders')
const orders = computed(() => data.value?.items ?? [])

const { data: stockData, pending: stockPending } = await useFetch<{ items: StockItem[] }>('/api/inventory/stock-items')

function onHand(s: StockItem): number {
  return s.item_stock_value == null ? 0 : Number(s.item_stock_value)
}
function stockCategory(s: StockItem): string {
  return typeof s.item_category === 'object' && s.item_category ? s.item_category.category_name : '—'
}
function stockLocation(s: StockItem): string {
  return typeof s.location === 'object' && s.location ? (s.location as Branch).shop_name : '—'
}

// Items at or below their reorder level (only those that have a reorder level set).
const lowStock = computed(() =>
  (stockData.value?.items ?? [])
    .filter(s => s.reorder_level != null && onHand(s) <= Number(s.reorder_level))
    .sort((a, b) => onHand(a) - onHand(b)),
)

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
function customerName(o: Order): string {
  return typeof o.partner_id === 'object' && o.partner_id ? (o.partner_id.partner_name ?? '—') : '—'
}
function customerId(o: Order): number | null {
  return typeof o.partner_id === 'object' && o.partner_id ? o.partner_id.id : (typeof o.partner_id === 'number' ? o.partner_id : null)
}

interface Row {
  raw: Order
  id: number
  customer: string
  customerId: number | null
  date: string | null
  total: number
  paid: boolean
  shipped: boolean
}

function toRow(o: Order): Row {
  return {
    raw: o,
    id: o.id,
    customer: customerName(o),
    customerId: customerId(o),
    date: o.order_date,
    total: o.total != null ? Number(o.total) : 0,
    paid: !!o.paid,
    shipped: !!o.shipped,
  }
}

function byDateAsc(a: Row, b: Row): number {
  return (a.date ?? '').localeCompare(b.date ?? '')
}

// Open = not completed (needs work). Oldest first.
const openOrders = computed(() => orders.value.filter(o => !o.completed).map(toRow).sort(byDateAsc))
// Completed but unpaid (awaiting collection). Oldest first.
const completedUnpaid = computed(() => orders.value.filter(o => o.completed && !o.paid).map(toRow).sort(byDateAsc))

const completedUnpaidValue = computed(() => completedUnpaid.value.reduce((t, r) => t + r.total, 0))
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Dashboard</h1>
    <p class="mt-1 text-sm text-slate-500">What needs working on across your orders.</p>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load orders.</Message>

    <!-- Summary -->
    <div class="mt-4 flex flex-wrap gap-3">
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Open orders</div>
        <div class="text-2xl font-semibold text-slate-900">{{ openOrders.length }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Completed, unpaid</div>
        <div class="text-2xl font-semibold text-amber-600">{{ completedUnpaid.length }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Uncollected value</div>
        <div class="text-2xl font-semibold text-slate-900">{{ money(completedUnpaidValue) }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Low stock items</div>
        <div class="text-2xl font-semibold" :class="lowStock.length ? 'text-red-600' : 'text-slate-900'">{{ lowStock.length }}</div>
      </div>
    </div>

    <!-- Open orders -->
    <h2 class="mt-8 text-sm font-semibold text-slate-900">Open orders <span class="font-normal text-slate-400">— not yet completed</span></h2>
    <div class="mt-3 overflow-x-auto">
      <DataTable
        :value="openOrders"
        :loading="pending"
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
        <template #empty><span class="text-sm text-slate-500">Nothing open — all caught up.</span></template>
        <Column field="id" header="Order" sortable>
          <template #body="{ data: row }">
            <NuxtLink :to="`/orders/${row.id}`" class="text-slate-900 hover:underline">#{{ row.id }}</NuxtLink>
          </template>
        </Column>
        <Column field="customer" header="Customer" sortable>
          <template #body="{ data: row }">
            <NuxtLink v-if="row.customerId" :to="`/customers/${row.customerId}`" class="text-slate-700 hover:underline">{{ row.customer }}</NuxtLink>
            <span v-else>{{ row.customer }}</span>
          </template>
        </Column>
        <Column field="date" header="Date" sortable>
          <template #body="{ data: row }">{{ row.date ? formatDate(row.date) : '—' }}</template>
        </Column>
        <Column field="total" header="Total" sortable>
          <template #body="{ data: row }">{{ money(row.total) }}</template>
        </Column>
        <Column header="Status">
          <template #body="{ data: row }">
            <div class="flex gap-1">
              <Tag :value="row.paid ? 'Paid' : 'Unpaid'" :severity="row.paid ? 'success' : 'secondary'" />
              <Tag v-if="row.shipped" value="Shipped" severity="info" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Completed but unpaid -->
    <h2 class="mt-8 text-sm font-semibold text-slate-900">Completed &amp; unpaid <span class="font-normal text-slate-400">— awaiting collection</span></h2>
    <div class="mt-3 overflow-x-auto">
      <DataTable
        :value="completedUnpaid"
        :loading="pending"
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
        :pt="{ table: { class: 'min-w-[36rem]' } }"
      >
        <template #empty><span class="text-sm text-slate-500">No completed orders awaiting payment.</span></template>
        <Column field="id" header="Order" sortable>
          <template #body="{ data: row }">
            <NuxtLink :to="`/orders/${row.id}`" class="text-slate-900 hover:underline">#{{ row.id }}</NuxtLink>
          </template>
        </Column>
        <Column field="customer" header="Customer" sortable>
          <template #body="{ data: row }">
            <NuxtLink v-if="row.customerId" :to="`/customers/${row.customerId}`" class="text-slate-700 hover:underline">{{ row.customer }}</NuxtLink>
            <span v-else>{{ row.customer }}</span>
          </template>
        </Column>
        <Column field="date" header="Date" sortable>
          <template #body="{ data: row }">{{ row.date ? formatDate(row.date) : '—' }}</template>
        </Column>
        <Column field="total" header="Total" sortable>
          <template #body="{ data: row }">{{ money(row.total) }}</template>
        </Column>
      </DataTable>
    </div>

    <!-- Low stock -->
    <h2 class="mt-8 text-sm font-semibold text-slate-900">Low stock <span class="font-normal text-slate-400">— at or below reorder level</span></h2>
    <div class="mt-3 overflow-x-auto">
      <DataTable
        :value="lowStock"
        :loading="stockPending"
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
        <template #empty><span class="text-sm text-slate-500">No items below reorder level.</span></template>
        <Column header="Item">
          <template #body="{ data: row }">
            <NuxtLink :to="`/inventory/stock/${row.id}`" class="text-slate-900 hover:underline">{{ row.item_name }}</NuxtLink>
          </template>
        </Column>
        <Column header="On hand">
          <template #body="{ data: row }">
            <span class="font-medium text-red-600">{{ onHand(row) }}</span> <span class="text-slate-400">{{ row.unit || '' }}</span>
          </template>
        </Column>
        <Column header="Reorder at">
          <template #body="{ data: row }">{{ row.reorder_level != null ? Number(row.reorder_level) : '—' }}</template>
        </Column>
        <Column header="Category">
          <template #body="{ data: row }">{{ stockCategory(row) }}</template>
        </Column>
        <Column header="Location">
          <template #body="{ data: row }">{{ stockLocation(row) }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
