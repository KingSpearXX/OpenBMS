<script setup lang="ts">
import type { Supplier } from '~/types/procurement'

useHead({ title: 'Suppliers' })

const { data, pending, refresh } = await useFetch<{ items: Supplier[] }>('/api/procurement/suppliers')
const search = ref('')

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (data.value?.items ?? []).filter(s => !q || s.name.toLowerCase().includes(q))
})

const formVisible = ref(false)
const editing = ref<Supplier | null>(null)
function openCreate() {
  editing.value = null
  formVisible.value = true
}
function openEdit(s: Supplier) {
  editing.value = s
  formVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<Supplier | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')
const { deleteSupplier } = useSuppliers()

function askDelete(s: Supplier) {
  deleting.value = s
  deleteError.value = ''
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteSupplier(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete supplier.'
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
        <NuxtLink to="/procurement" class="text-sm text-slate-500 hover:underline">← Procurement</NuxtLink>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">Suppliers</h1>
        <p class="mt-1 text-sm text-slate-500">Vendors you purchase from.</p>
      </div>
      <Button icon="pi pi-plus" label="Add supplier" class="self-start" @click="openCreate" />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search suppliers" fluid />
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
        :rows-per-page-options="[25, 50]"
        :paginator-template="{
          '640px': 'PrevPageLink CurrentPageReport NextPageLink',
          default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
        }"
        current-page-report-template="{currentPage} / {totalPages}"
        :pt="{ table: { class: 'min-w-[36rem]' } }"
      >
        <template #empty><span class="text-sm text-slate-500">No suppliers yet.</span></template>

        <Column field="name" header="Name" sortable />

        <Column header="Contact">
          <template #body="{ data: row }">
            <div class="text-sm">
              <div v-if="row.email" class="text-slate-700">{{ row.email }}</div>
              <div v-if="row.phone" class="text-slate-500">{{ row.phone }}</div>
              <span v-if="!row.email && !row.phone" class="text-slate-400">—</span>
            </div>
          </template>
        </Column>

        <Column header="Status">
          <template #body="{ data: row }">
            <Tag
              :value="row.status"
              :severity="row.status === 'active' ? 'success' : 'secondary'"
            />
          </template>
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

    <ProcurementSupplierForm v-model:visible="formVisible" :supplier="editing" @saved="refresh" />
    <UiConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete supplier"
      :message="deleting ? `Delete '${deleting.name}'? This cannot be undone.` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
