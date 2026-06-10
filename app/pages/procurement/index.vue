<script setup lang="ts">
import type { ProcurementOrder, Supplier } from '~/types/procurement'

useHead({ title: 'Procurement' })

type OrderRow = ProcurementOrder & { supplier: Supplier | null; lines: { id: number }[] }

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
]

const filterStatus = ref('')
const search = ref('')

const { data, pending, refresh } = await useFetch<{ items: OrderRow[] }>('/api/procurement', {
  query: { status: filterStatus },
  watch: [filterStatus],
})

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (data.value?.items ?? []).filter(r => {
    if (!q) return true
    const sup = typeof r.supplier === 'object' ? r.supplier?.name ?? '' : ''
    return `${r.reference_number} ${sup}`.toLowerCase().includes(q)
  })
})

const statusSeverity: Record<string, string> = {
  draft: 'secondary',
  sent: 'info',
  received: 'success',
  cancelled: 'danger',
}

const formVisible = ref(false)

async function onOrderCreated(id: number) {
  await navigateTo(`/procurement/${id}`)
}

const deleteVisible = ref(false)
const deleting = ref<OrderRow | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')
const { deleteOrder } = useProcurement()

function askDelete(row: OrderRow) {
  deleting.value = row
  deleteError.value = ''
  deleteVisible.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteOrder(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete order.'
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
        <h1 class="text-xl font-semibold text-slate-900">Procurement</h1>
        <p class="mt-1 text-sm text-slate-500">Purchase orders sent to suppliers.</p>
      </div>
      <div class="flex items-center gap-2 self-start">
        <NuxtLink to="/procurement/suppliers">
          <Button label="Suppliers" icon="pi pi-truck" outlined size="small" />
        </NuxtLink>
        <Button icon="pi pi-plus" label="New order" @click="formVisible = true" />
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <label class="text-xs font-medium text-slate-500">Status</label>
        <Select v-model="filterStatus" :options="statusOptions" option-label="label" option-value="value" class="w-40" />
      </div>
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search orders" fluid />
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
        :pt="{ table: { class: 'min-w-[42rem]' } }"
      >
        <template #empty><span class="text-sm text-slate-500">No orders match these filters.</span></template>

        <Column header="Reference" sortable sort-field="reference_number">
          <template #body="{ data: row }">
            <NuxtLink :to="`/procurement/${row.id}`" class="font-medium text-slate-900 hover:underline">
              {{ row.reference_number ?? `#${row.id}` }}
            </NuxtLink>
          </template>
        </Column>

        <Column header="Supplier" sortable sort-field="supplier.name">
          <template #body="{ data: row }">
            {{ typeof row.supplier === 'object' ? (row.supplier?.name ?? '—') : '—' }}
          </template>
        </Column>

        <Column header="Date" sortable sort-field="order_date">
          <template #body="{ data: row }">{{ row.order_date ? formatDate(row.order_date) : '—' }}</template>
        </Column>

        <Column header="Lines">
          <template #body="{ data: row }">{{ row.lines?.length ?? 0 }}</template>
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
                @click="navigateTo(`/procurement/${row.id}`)"
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

    <ProcurementOrderForm v-model:visible="formVisible" @created="onOrderCreated" />

    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete order"
      :message="deleting ? `Delete ${deleting.reference_number ?? 'this order'}? This cannot be undone.` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
