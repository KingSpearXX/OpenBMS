<script setup lang="ts">
import type { LedgerEntry } from '~/types/ledger'
import type { Branch } from '~/types/inventory'

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
const range = ref<(Date | null)[]>([monthStart, today])

const { data: branchData } = await useFetch<{ items: Branch[] }>('/api/inventory/branches')
const branches = computed(() => branchData.value?.items ?? [])
const selectedBranch = ref<string>('')
watch(branches, (b) => {
  if (!selectedBranch.value && b.length) selectedBranch.value = b[0]!.id
}, { immediate: true })

const selectedBranchName = computed(
  () => branches.value.find(b => b.id === selectedBranch.value)?.shop_name ?? '',
)

const fromDate = computed(() => (range.value?.[0] ? ymd(range.value[0]!) : undefined))
const toDate = computed(() => {
  const end = range.value?.[1] ?? range.value?.[0]
  return end ? ymd(end) : undefined
})

const { data, pending, refresh } = await useFetch<{ items: LedgerEntry[] }>('/api/ledger/entries', {
  query: { branch: selectedBranch, from: fromDate, to: toDate },
  watch: [selectedBranch, fromDate, toDate],
})

const entries = computed(() => computeRunningBalance(data.value?.items ?? []))

const totalIn = computed(() =>
  (data.value?.items ?? [])
    .filter(e => e.direction === 'in')
    .reduce((t, e) => t + (Number(e.amount) || 0), 0),
)
const totalOut = computed(() =>
  (data.value?.items ?? [])
    .filter(e => e.direction === 'out')
    .reduce((t, e) => t + (Number(e.amount) || 0), 0),
)
const net = computed(() => totalIn.value - totalOut.value)

const dialogVisible = ref(false)
const editing = ref<LedgerEntry | null>(null)

function openCreate() {
  editing.value = null
  dialogVisible.value = true
}
function openEdit(e: LedgerEntry) {
  editing.value = { ...e }
  dialogVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<LedgerEntry | null>(null)
const deleteLoading = ref(false)
const { deleteEntry } = useLedger()

function askDelete(e: LedgerEntry) {
  deleting.value = e
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteEntry(deleting.value.id)
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
        <h1 class="text-xl font-semibold text-slate-900">Cash Ledger</h1>
        <p class="mt-1 text-sm text-slate-500">Manual cash in/out record per branch.</p>
      </div>
      <Button
        icon="pi pi-plus"
        label="Add entry"
        class="self-start"
        :disabled="!selectedBranch"
        @click="openCreate"
      />
    </div>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div v-if="branches.length > 1" class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Branch</label>
        <Select
          v-model="selectedBranch"
          :options="branches"
          option-label="shop_name"
          option-value="id"
          class="w-48"
        />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Date range</label>
        <DatePicker
          v-model="range"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-icon
          class="w-64"
        />
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Cash In</div>
        <div class="text-lg font-semibold text-emerald-700">{{ formatCurrency(totalIn) }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Cash Out</div>
        <div class="text-lg font-semibold text-red-700">{{ formatCurrency(totalOut) }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div class="text-xs text-slate-500">Net</div>
        <div
          class="text-lg font-semibold"
          :class="net >= 0 ? 'text-slate-900' : 'text-red-700'"
        >
          {{ formatCurrency(net) }}
        </div>
      </div>
    </div>

    <div class="mt-4 overflow-x-auto">
      <DataTable
        :value="entries"
        :loading="pending"
        data-key="id"
        striped-rows
        paginator
        :rows="50"
        :rows-per-page-options="[25, 50, 100]"
        :paginator-template="{
          '640px': 'PrevPageLink CurrentPageReport NextPageLink',
          '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
          default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
        }"
        current-page-report-template="{currentPage} / {totalPages}"
        :pt="{ table: { class: 'min-w-[56rem]' } }"
      >
        <template #empty>
          <span class="text-sm text-slate-500">
            {{ selectedBranch ? 'No entries for this period.' : 'Select a branch to view the ledger.' }}
          </span>
        </template>
        <Column field="entry_date" header="Date" sortable />
        <Column field="description" header="Description" />
        <Column field="category" header="Category">
          <template #body="{ data: row }">{{ row.category ?? '—' }}</template>
        </Column>
        <Column field="reference" header="Reference">
          <template #body="{ data: row }">{{ row.reference ?? '—' }}</template>
        </Column>
        <Column header="Cash In">
          <template #body="{ data: row }">
            <span v-if="row.direction === 'in'" class="font-medium text-emerald-700">
              {{ formatCurrency(Number(row.amount)) }}
            </span>
            <span v-else class="text-slate-300">—</span>
          </template>
        </Column>
        <Column header="Cash Out">
          <template #body="{ data: row }">
            <span v-if="row.direction === 'out'" class="font-medium text-red-700">
              {{ formatCurrency(Number(row.amount)) }}
            </span>
            <span v-else class="text-slate-300">—</span>
          </template>
        </Column>
        <Column header="Balance">
          <template #body="{ data: row }">
            <span
              class="font-semibold"
              :class="row.balance >= 0 ? 'text-slate-900' : 'text-red-700'"
            >
              {{ formatCurrency(row.balance) }}
            </span>
          </template>
        </Column>
        <Column header="" class="w-24">
          <template #body="{ data: row }">
            <div class="flex justify-end gap-1">
              <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" @click="openEdit(row)" />
              <Button
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                aria-label="Delete"
                @click="askDelete(row)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <LedgerEntryDialog
      v-model:visible="dialogVisible"
      :entry="editing"
      :branch-id="selectedBranch"
      :branch-name="selectedBranchName"
      @saved="refresh"
    />
    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete entry"
      :message="deleting
        ? `Delete this ${deleting.direction === 'in' ? 'cash in' : 'cash out'} entry (${formatCurrency(Number(deleting.amount))})?`
        : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
