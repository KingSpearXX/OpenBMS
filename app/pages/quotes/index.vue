<script setup lang="ts">
import type { Quote } from '~/types/quotes'
import type { Customer } from '~/types/sales'

useHead({ title: 'Quotes' })

const { listQuotes, deleteQuote } = useQuotes()

const filterStatus = ref('')
const search = ref('')

const { data: customersData } = await useFetch<{ items: Customer[] }>('/api/customers')
const customers = computed(() => customersData.value?.items ?? [])
const selectedCustomer = ref<number | ''>('')

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Expired', value: 'expired' },
]

const { data, pending, refresh } = await useFetch<{ items: Quote[] }>('/api/quotes')

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (data.value?.items ?? []).filter(r => {
    if (!q) return true
    const name = typeof r.customer === 'object' ? r.customer?.partner_name ?? '' : ''
    return name.toLowerCase().includes(q)
  })
})

const statusSeverity: Record<string, string> = {
  draft: 'secondary',
  sent: 'info',
  accepted: 'success',
  expired: 'warn',
}

// Create
const formVisible = ref(false)
async function onQuoteCreated(id: string) {
  await navigateTo(`/quotes/${id}`)
}

// Delete
const deleteVisible = ref(false)
const deleting = ref<(Quote & { lines: { id: string }[] }) | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')

function askDelete(row: Quote & { lines: { id: string }[] }) {
  deleting.value = row
  deleteError.value = ''
  deleteVisible.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteQuote(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete quote.'
  }
  finally {
    deleteLoading.value = false
  }
}

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Quotes</h1>
        <p class="mt-1 text-sm text-slate-500">Sales quotations sent to customers.</p>
      </div>
      <Button icon="pi pi-plus" label="New quote" class="self-start" @click="formVisible = true" />
    </div>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Status</label>
        <Select v-model="filterStatus" :options="statusOptions" option-label="label" option-value="value" class="w-36" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Customer</label>
        <Select
          v-model="selectedCustomer"
          :options="[{ id: '', partner_name: 'All customers' } as any, ...customers]"
          option-label="partner_name"
          option-value="id"
          class="w-48"
          :show-clear="selectedCustomer !== ''"
        />
      </div>
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search" fluid />
      </IconField>
    </div>

    <div class="mt-4 overflow-x-auto">
      <DataTable
        :value="rows"
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
        <template #empty><span class="text-sm text-slate-500">No quotes match these filters.</span></template>

        <Column header="Customer" sortable sort-field="customer.partner_name">
          <template #body="{ data: row }">
            <NuxtLink :to="`/quotes/${row.id}`" class="font-medium text-slate-900 hover:underline">
              {{ typeof row.customer === 'object' ? (row.customer?.partner_name ?? '—') : '—' }}
            </NuxtLink>
          </template>
        </Column>

        <Column header="Date" sortable sort-field="quote_date">
          <template #body="{ data: row }">{{ row.quote_date ? formatDate(row.quote_date) : '—' }}</template>
        </Column>

        <Column header="Expires" sortable sort-field="expiration_date">
          <template #body="{ data: row }">{{ row.expiration_date ? formatDate(row.expiration_date) : '—' }}</template>
        </Column>

        <Column header="Total" sortable sort-field="total">
          <template #body="{ data: row }">{{ money(row.total) }}</template>
        </Column>

        <Column header="Status">
          <template #body="{ data: row }">
            <Tag :value="row.status" :severity="statusSeverity[row.status] ?? 'secondary'" />
          </template>
        </Column>

        <Column header="" class="w-24">
          <template #body="{ data: row }">
            <div class="flex justify-end gap-1">
              <Button
                icon="pi pi-arrow-right"
                text rounded size="small"
                aria-label="Open"
                @click="navigateTo(`/quotes/${row.id}`)"
              />
              <Button
                icon="pi pi-trash"
                text rounded size="small"
                severity="danger"
                aria-label="Delete"
                @click="askDelete(row)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <QuotesQuoteForm v-model:visible="formVisible" @created="onQuoteCreated" />

    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete quote"
      :message="deleting ? `Delete quote for ${typeof deleting.customer === 'object' ? deleting.customer?.partner_name ?? 'this customer' : 'this customer'}? This cannot be undone.` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
