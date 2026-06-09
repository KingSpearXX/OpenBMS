<script setup lang="ts">
import type { Branch } from '~/types/inventory'
import type { PosSale } from '~/types/pos'

const { data: branchData } = await useFetch<{ items: Branch[] }>('/api/inventory/branches')
const branches = computed(() => branchData.value?.items ?? [])

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Default to the last 7 days.
const today = new Date()
const weekAgo = new Date()
weekAgo.setDate(today.getDate() - 6)
const range = ref<(Date | null)[]>([weekAgo, today])

const selectedBranch = ref<string>('')
const selectedMethod = ref<string>('')
const search = ref('')

const fromDate = computed(() => (range.value?.[0] ? `${ymd(range.value[0]!)}T00:00:00` : undefined))
const toDate = computed(() => {
  const end = range.value?.[1] ?? range.value?.[0]
  return end ? `${ymd(end)}T23:59:59` : undefined
})

const { data, pending } = await useFetch<{ items: PosSale[] }>('/api/pos/sales', {
  query: { from: fromDate, to: toDate, branch: selectedBranch, method: selectedMethod },
  watch: [fromDate, toDate, selectedBranch, selectedMethod],
})
const allSales = computed(() => data.value?.items ?? [])

const sales = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allSales.value.filter(s => !q || (s.product_name ?? '').toLowerCase().includes(q))
})

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
function fmtDateTime(s: string | null): string {
  if (!s) return '—'
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`
}
function branchName(s: PosSale): string {
  return typeof s.sales_branch === 'object' && s.sales_branch ? s.sales_branch.shop_name : '—'
}

const total = computed(() => sales.value.reduce((sum, s) => sum + (Number(s.amount) || 0), 0))
const cashTotal = computed(() => sales.value.filter(s => s.payment_method === 'cash').reduce((t, s) => t + (Number(s.amount) || 0), 0))
const depositTotal = computed(() => sales.value.filter(s => s.payment_method === 'deposit').reduce((t, s) => t + (Number(s.amount) || 0), 0))

const branchOptions = computed(() => [{ id: '', shop_name: 'All branches' }, ...branches.value])
const methodOptions = [{ label: 'All payments', value: '' }, ...PAYMENT_METHODS]
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Sales history</h1>
        <p class="mt-1 text-sm text-slate-500">Filter recorded sales by date, branch, payment, or product.</p>
      </div>
      <NuxtLink to="/pos" class="text-sm text-slate-600 hover:underline sm:self-center">← Point of Sale</NuxtLink>
    </div>

    <!-- Filters -->
    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Date range</label>
        <DatePicker v-model="range" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-icon class="w-64" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Branch</label>
        <Select v-model="selectedBranch" :options="branchOptions" option-label="shop_name" option-value="id" class="w-48" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Payment</label>
        <Select v-model="selectedMethod" :options="methodOptions" option-label="label" option-value="value" class="w-44" />
      </div>
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search product" fluid />
      </IconField>
    </div>

    <!-- Totals -->
    <div class="mt-4 flex flex-wrap gap-3">
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Total ({{ sales.length }} sales)</div>
        <div class="text-lg font-semibold text-slate-900">{{ money(total) }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Cash</div>
        <div class="text-lg font-medium text-slate-700">{{ money(cashTotal) }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Deposit</div>
        <div class="text-lg font-medium text-slate-700">{{ money(depositTotal) }}</div>
      </div>
    </div>

    <div class="mt-4 overflow-x-auto">
      <DataTable
        :value="sales"
        :loading="pending"
        data-key="id"
        striped-rows
        paginator
        :rows="25"
        :rows-per-page-options="[25, 50, 100]"
        :paginator-template="{
          '640px': 'PrevPageLink CurrentPageReport NextPageLink',
          '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
          default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
        }"
        current-page-report-template="{currentPage} / {totalPages}"
        :pt="{ table: { class: 'min-w-[48rem]' } }"
      >
        <template #empty><span class="text-sm text-slate-500">No sales match these filters.</span></template>
        <Column header="When">
          <template #body="{ data: row }">{{ fmtDateTime(row.sold_at) }}</template>
        </Column>
        <Column field="product_name" header="Product" sortable />
        <Column header="Qty">
          <template #body="{ data: row }">{{ row.quantity != null ? Number(row.quantity) : '—' }}</template>
        </Column>
        <Column header="Amount">
          <template #body="{ data: row }">{{ money(row.amount) }}</template>
        </Column>
        <Column header="Payment">
          <template #body="{ data: row }">{{ paymentLabel(row.payment_method) }}</template>
        </Column>
        <Column v-if="branches.length > 1" header="Branch">
          <template #body="{ data: row }">{{ branchName(row) }}</template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
