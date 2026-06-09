<script setup lang="ts">
import type { Customer } from '~/types/sales'

const { data, pending, error, refresh } = await useFetch<{ items: Customer[] }>('/api/customers')

interface Row {
  raw: Customer
  id: number
  name: string
  credit: number
}

const rows = computed<Row[]>(() =>
  (data.value?.items ?? []).map(c => ({
    raw: c,
    id: c.id,
    name: c.partner_name ?? '(unnamed)',
    credit: c.credit != null ? Number(c.credit) : 0,
  })),
)

const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(r => !q || r.name.toLowerCase().includes(q))
})

const formVisible = ref(false)
const editing = ref<Customer | null>(null)
function openCreate() {
  editing.value = null
  formVisible.value = true
}
function openEdit(c: Customer) {
  editing.value = c
  formVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<Customer | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')
const { deleteCustomer } = useSales()

function askDelete(c: Customer) {
  deleting.value = c
  deleteError.value = ''
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteCustomer(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete. They may have orders or contacts.'
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
        <h1 class="text-xl font-semibold text-slate-900">Customers</h1>
        <p class="mt-1 text-sm text-slate-500">Partners you sell to, their contacts and orders.</p>
      </div>
      <Button icon="pi pi-plus" label="Add customer" class="self-start" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load customers.</Message>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search customers" fluid />
      </IconField>
    </div>

    <div class="mt-4 overflow-x-auto">
      <DataTable
        :value="filtered"
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
        :pt="{ table: { class: 'min-w-[34rem]' } }"
      >
        <template #empty>
          <span class="text-sm text-slate-500">No customers.</span>
        </template>
        <Column field="name" header="Name" sortable>
          <template #body="{ data: row }">
            <NuxtLink :to="`/customers/${row.id}`" class="text-slate-900 hover:underline">{{ row.name }}</NuxtLink>
          </template>
        </Column>
        <Column field="credit" header="Store credit" sortable>
          <template #body="{ data: row }">{{ formatCurrency(row.credit) }}</template>
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

    <SalesCustomerForm v-model:visible="formVisible" :customer="editing" @saved="refresh" />
    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete customer"
      :message="deleting ? `Delete “${deleting.partner_name || 'this customer'}”? This cannot be undone.` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
