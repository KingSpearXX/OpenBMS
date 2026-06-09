<script setup lang="ts">
import type { Branch, Product } from '~/types/inventory'
import type { PosSale } from '~/types/pos'

const { data: branchData } = await useFetch<{ items: Branch[] }>('/api/inventory/branches')
const { data: prodData } = await useFetch<{ items: Product[] }>('/api/inventory/products')
const branches = computed(() => branchData.value?.items ?? [])
const products = computed(() => prodData.value?.items ?? [])

// Selected day + branch drive the list and the default sale date.
const selectedDate = ref<Date>(new Date())
const selectedBranch = ref<string>('')
watch(branches, (b) => {
  const first = b[0]
  if (!selectedBranch.value && first) selectedBranch.value = first.id
}, { immediate: true })

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${ymd(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const dayFrom = computed(() => `${ymd(selectedDate.value)}T00:00:00`)
const dayTo = computed(() => `${ymd(selectedDate.value)}T23:59:59`)

const { data, pending, refresh } = await useFetch<{ items: PosSale[] }>('/api/pos/sales', {
  query: { from: dayFrom, to: dayTo, branch: selectedBranch },
  watch: [dayFrom, dayTo, selectedBranch],
})
const sales = computed(() => data.value?.items ?? [])

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
function timeOf(s: string | null): string {
  return s ? s.slice(11, 16) : '—'
}

// Day totals + per-method split.
const dayTotal = computed(() => sales.value.reduce((sum, s) => sum + (Number(s.amount) || 0), 0))
const cashTotal = computed(() => sales.value.filter(s => s.payment_method === 'cash').reduce((t, s) => t + (Number(s.amount) || 0), 0))
const depositTotal = computed(() => sales.value.filter(s => s.payment_method === 'deposit').reduce((t, s) => t + (Number(s.amount) || 0), 0))

// --- quick add ---
const { createSale, deleteSale } = usePos()
const entry = reactive({
  name: '' as string,
  price: null as number | null,
  qty: 1 as number | null,
  method: 'cash' as string,
})
const pickedProduct = ref<number | null>(null)
const adding = ref(false)
const addError = ref('')

watch(pickedProduct, (id) => {
  if (id == null) return
  const p = products.value.find(x => x.id === id)
  if (!p) return
  entry.name = p.name ?? ''
  entry.price = p.unit_price != null ? Number(p.unit_price) : null
})

// sold_at = selected day at the current clock time (now for today; that day otherwise).
function saleSoldAt(): string {
  const now = new Date()
  const d = new Date(selectedDate.value)
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0)
  return localIso(d)
}

async function add() {
  if (!entry.name.trim()) {
    addError.value = 'Enter a product or description.'
    return
  }
  adding.value = true
  addError.value = ''
  try {
    await createSale({
      product_name: entry.name.trim(),
      unit_price: entry.price ?? 0,
      quantity: entry.qty ?? 1,
      payment_method: entry.method as 'cash' | 'deposit',
      sales_branch: selectedBranch.value || null,
      sold_at: saleSoldAt(),
      product: pickedProduct.value,
    })
    // Reset for the next sale; keep method + qty for rapid repeated entry.
    entry.name = ''
    entry.price = null
    pickedProduct.value = null
    await refresh()
    document.getElementById('pos-name')?.focus()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    addError.value = err?.data?.statusMessage || 'Could not record sale.'
  }
  finally {
    adding.value = false
  }
}

// --- edit / delete ---
const editVisible = ref(false)
const editing = ref<PosSale | null>(null)
function openEdit(s: PosSale) {
  editing.value = s
  editVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<PosSale | null>(null)
const deleteLoading = ref(false)
function askDelete(s: PosSale) {
  deleting.value = s
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteSale(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Point of Sale</h1>
        <p class="mt-1 text-sm text-slate-500">Record each sale fast. Set the date to encode earlier sales.</p>
      </div>
      <NuxtLink to="/pos/history" class="text-sm text-slate-600 hover:underline sm:self-center">Sales history →</NuxtLink>
    </div>

    <!-- Day + branch -->
    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Date</label>
        <DatePicker v-model="selectedDate" date-format="yy-mm-dd" show-icon class="w-44" />
      </div>
      <div v-if="branches.length > 1" class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Branch</label>
        <Select v-model="selectedBranch" :options="branches" option-label="shop_name" option-value="id" class="w-48" />
      </div>
    </div>

    <!-- Quick add -->
    <form class="mt-4 rounded-lg border border-slate-200 bg-white p-4" @submit.prevent="add">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
        <div class="sm:col-span-3 space-y-1">
          <label class="text-xs font-medium text-slate-500">From catalog</label>
          <Select v-model="pickedProduct" :options="products" option-label="name" option-value="id" show-clear filter placeholder="Optional" fluid />
        </div>
        <div class="sm:col-span-4 space-y-1">
          <label class="text-xs font-medium text-slate-500">Product / description</label>
          <InputText id="pos-name" v-model="entry.name" fluid />
        </div>
        <div class="sm:col-span-2 space-y-1">
          <label class="text-xs font-medium text-slate-500">Price</label>
          <InputNumber v-model="entry.price" mode="decimal" :max-fraction-digits="2" fluid />
        </div>
        <div class="sm:col-span-1 space-y-1">
          <label class="text-xs font-medium text-slate-500">Qty</label>
          <InputNumber v-model="entry.qty" :min="0" :max-fraction-digits="3" fluid />
        </div>
        <div class="sm:col-span-2 space-y-1">
          <label class="text-xs font-medium text-slate-500">Payment</label>
          <Select v-model="entry.method" :options="PAYMENT_METHODS" option-label="label" option-value="value" fluid />
        </div>
      </div>
      <div class="mt-3 flex items-center gap-3">
        <Button type="submit" icon="pi pi-plus" label="Record sale" :loading="adding" />
        <Message v-if="addError" severity="error" :closable="false" size="small">{{ addError }}</Message>
      </div>
    </form>

    <!-- Totals -->
    <div class="mt-4 flex flex-wrap gap-3">
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Day total</div>
        <div class="text-lg font-semibold text-slate-900">{{ money(dayTotal) }}</div>
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

    <!-- Day's sales -->
    <div class="mt-4 overflow-x-auto">
      <DataTable
        :value="sales"
        :loading="pending"
        data-key="id"
        striped-rows
        paginator
        :rows="15"
        :rows-per-page-options="[15, 30, 50]"
        :paginator-template="{
          '640px': 'PrevPageLink CurrentPageReport NextPageLink',
          '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
          default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
        }"
        current-page-report-template="{currentPage} / {totalPages}"
        :pt="{ table: { class: 'min-w-[44rem]' } }"
      >
        <template #empty><span class="text-sm text-slate-500">No sales recorded for this day.</span></template>
        <Column header="Time">
          <template #body="{ data: row }">{{ timeOf(row.sold_at) }}</template>
        </Column>
        <Column field="product_name" header="Product" />
        <Column header="Qty">
          <template #body="{ data: row }">{{ row.quantity != null ? Number(row.quantity) : '—' }}</template>
        </Column>
        <Column header="Price">
          <template #body="{ data: row }">{{ money(row.unit_price) }}</template>
        </Column>
        <Column header="Amount">
          <template #body="{ data: row }">{{ money(row.amount) }}</template>
        </Column>
        <Column header="Payment">
          <template #body="{ data: row }">{{ paymentLabel(row.payment_method) }}</template>
        </Column>
        <Column header="" class="w-24">
          <template #body="{ data: row }">
            <div class="flex justify-end gap-1">
              <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" @click="openEdit(row)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Delete" @click="askDelete(row)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <PosSaleDialog
      v-model:visible="editVisible"
      :sale="editing"
      :products="products"
      :branches="branches"
      @saved="refresh"
    />
    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete sale"
      :message="deleting ? `Delete this sale (${money(deleting.amount)})?` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
