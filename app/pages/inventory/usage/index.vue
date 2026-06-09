<script setup lang="ts">
import type { StockItem, UsageLog } from '~/types/inventory'

const { data, pending, error, refresh } = await useFetch<{ items: UsageLog[] }>('/api/inventory/usage')
const { data: stockData } = await useFetch<{ items: StockItem[] }>('/api/inventory/stock-items')

const stockItems = computed(() => stockData.value?.items ?? [])

function itemId(log: UsageLog): number | null {
  return typeof log.media_item_name === 'object' && log.media_item_name
    ? log.media_item_name.id
    : (log.media_item_name as number | null)
}
function itemName(log: UsageLog): string {
  return typeof log.media_item_name === 'object' && log.media_item_name ? log.media_item_name.item_name : '—'
}

interface Row {
  raw: UsageLog
  id: number
  when: string | null
  itemId: number | null
  item: string
  used: number | null
}

const rows = computed<Row[]>(() =>
  (data.value?.items ?? []).map(l => ({
    raw: l,
    id: l.id,
    when: l.date_created,
    itemId: itemId(l),
    item: itemName(l),
    used: l.item_usage_value != null ? Number(l.item_usage_value) : null,
  })),
)

const search = ref('')
const itemFilter = ref<number | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (itemFilter.value != null && r.itemId !== itemFilter.value) return false
    if (q && !r.item.toLowerCase().includes(q)) return false
    return true
  })
})

const formVisible = ref(false)
const editing = ref<UsageLog | null>(null)
function openCreate() {
  editing.value = null
  formVisible.value = true
}
function openEdit(l: UsageLog) {
  editing.value = l
  formVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<UsageLog | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')
const { deleteUsage } = useInventory()

function askDelete(l: UsageLog) {
  deleting.value = l
  deleteError.value = ''
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteUsage(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete usage.'
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
        <h1 class="text-xl font-semibold text-slate-900">Stock usage</h1>
        <p class="mt-1 text-sm text-slate-500">Consumption events. Logging deducts stock; deleting restores it.</p>
      </div>
      <Button icon="pi pi-plus" label="Log usage" class="self-start" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load usage history.</Message>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search by item" fluid />
      </IconField>
      <Select
        v-model="itemFilter"
        :options="stockItems"
        option-label="item_name"
        option-value="id"
        show-clear
        filter
        placeholder="All items"
        class="w-full sm:w-64"
      />
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
        :pt="{ table: { class: 'min-w-[40rem]' } }"
      >
        <template #empty>
          <span class="text-sm text-slate-500">No usage logged yet.</span>
        </template>
      <Column field="when" header="When" sortable>
        <template #body="{ data: row }">
          <span class="text-slate-700">{{ row.when ? formatDate(row.when) : '—' }}</span>
        </template>
      </Column>
      <Column field="item" header="Item" sortable>
        <template #body="{ data: row }">
          <NuxtLink v-if="row.itemId" :to="`/inventory/stock/${row.itemId}`" class="text-slate-900 hover:underline">{{ row.item }}</NuxtLink>
          <span v-else>{{ row.item }}</span>
        </template>
      </Column>
      <Column field="used" header="Used" sortable>
        <template #body="{ data: row }">{{ row.used != null ? row.used : '—' }}</template>
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

    <InventoryUsageLogDialog
      v-model:visible="formVisible"
      :log="editing"
      :stock-items="stockItems"
      @saved="refresh"
    />
    <InventoryConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete usage"
      message="Delete this usage event? The deducted stock will be restored."
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
