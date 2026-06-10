<script setup lang="ts">
import type { Expense } from '~/types/expenses'
import type { Branch } from '~/types/inventory'

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Default to the last 30 days.
const today = new Date()
const monthAgo = new Date()
monthAgo.setDate(today.getDate() - 29)
const range = ref<(Date | null)[]>([monthAgo, today])
const selectedCategory = ref<string>('')
const search = ref('')

const fromDate = computed(() => (range.value?.[0] ? `${ymd(range.value[0]!)}T00:00:00` : undefined))
const toDate = computed(() => {
  const end = range.value?.[1] ?? range.value?.[0]
  return end ? `${ymd(end)}T23:59:59` : undefined
})

const { data: branchData } = await useFetch<{ items: Branch[] }>('/api/inventory/branches')
const branches = computed(() => branchData.value?.items ?? [])
const branchOptions = computed(() => [{ id: '', shop_name: 'All branches' }, ...branches.value])
const selectedBranch = ref<string>('')

const { data, pending, refresh } = await useFetch<{ items: Expense[] }>('/api/expenses', {
  query: { from: fromDate, to: toDate, category: selectedCategory, branch: selectedBranch },
  watch: [fromDate, toDate, selectedCategory, selectedBranch],
})

const categoryOptions = computed(() => [{ label: 'All categories', value: '' }, ...EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))])

interface Row {
  raw: Expense
  id: number
  date: string | null
  amount: number
  category: string
  description: string
  attachment: string | null
  branchName: string
}

const rows = computed<Row[]>(() =>
  (data.value?.items ?? []).map(e => ({
    raw: e,
    id: e.id,
    date: e.date_created,
    amount: e.expense_amount != null ? Number(e.expense_amount) : 0,
    category: e.expense_category ?? '—',
    description: e.expense_description ?? '',
    attachment: e.expense_attachment ?? null,
    branchName: branches.value.find(b => b.id === e.branch)?.shop_name ?? '—',
  })),
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(r => !q || `${r.category} ${r.description}`.toLowerCase().includes(q))
})

const total = computed(() => filtered.value.reduce((t, r) => t + r.amount, 0))

function money(value: number): string {
  return formatCurrency(value)
}

const formVisible = ref(false)
const editing = ref<Expense | null>(null)
function openCreate() {
  editing.value = null
  formVisible.value = true
}
function openEdit(e: Expense) {
  editing.value = e
  formVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<Expense | null>(null)
const deleteLoading = ref(false)
const { deleteExpense } = useExpenses()
function askDelete(e: Expense) {
  deleting.value = e
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteExpense(deleting.value.id)
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
        <h1 class="text-xl font-semibold text-slate-900">Expenses</h1>
        <p class="mt-1 text-sm text-slate-500">Shop expenses by category, with receipts.</p>
      </div>
      <Button icon="pi pi-plus" label="Add expense" class="self-start" @click="openCreate" />
    </div>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Date range</label>
        <DatePicker v-model="range" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-icon class="w-64" />
      </div>
      <div v-if="branches.length > 1" class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Branch</label>
        <Select v-model="selectedBranch" :options="branchOptions" option-label="shop_name" option-value="id" class="w-44" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Category</label>
        <Select v-model="selectedCategory" :options="categoryOptions" option-label="label" option-value="value" class="w-48" />
      </div>
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search" fluid />
      </IconField>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Total ({{ filtered.length }} expenses)</div>
        <div class="text-lg font-semibold text-slate-900">{{ money(total) }}</div>
      </div>
    </div>

    <div class="mt-4 overflow-x-auto">
      <DataTable
        :value="filtered"
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
        :pt="{ table: { class: 'min-w-[44rem]' } }"
      >
        <template #empty><span class="text-sm text-slate-500">No expenses match these filters.</span></template>
        <Column field="date" header="Date" sortable>
          <template #body="{ data: row }">{{ row.date ? formatDate(row.date) : '—' }}</template>
        </Column>
        <Column field="branchName" header="Branch" sortable />
        <Column field="category" header="Category" sortable />
        <Column field="description" header="Description">
          <template #body="{ data: row }">{{ row.description || '—' }}</template>
        </Column>
        <Column field="amount" header="Amount" sortable>
          <template #body="{ data: row }">{{ money(row.amount) }}</template>
        </Column>
        <Column header="Receipt">
          <template #body="{ data: row }">
            <a v-if="row.attachment" :href="`/api/expenses/attachment/${row.attachment}`" target="_blank" class="text-slate-700 underline">View</a>
            <span v-else class="text-slate-400">—</span>
          </template>
        </Column>
        <Column header="" class="w-24">
          <template #body="{ data: row }">
            <div class="flex justify-end gap-1">
              <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" @click="openEdit(row.raw)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Delete" @click="askDelete(row.raw)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ExpensesExpenseForm v-model:visible="formVisible" :expense="editing" @saved="refresh" />
    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete expense"
      :message="deleting ? `Delete this expense (${money(Number(deleting.expense_amount) || 0)})?` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
