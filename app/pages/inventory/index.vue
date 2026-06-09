<script setup lang="ts">
import type { Branch, Category, StockItem } from '~/types/inventory'

const { data, pending, error, refresh } = await useFetch<{ items: StockItem[] }>('/api/inventory/stock-items')
const { data: catData } = await useFetch<{ items: Category[] }>('/api/inventory/categories')
const { data: branchData } = await useFetch<{ items: Branch[] }>('/api/inventory/branches')

const categories = computed(() => catData.value?.items ?? [])
const branches = computed(() => branchData.value?.items ?? [])

function num(value: number | string | null): number {
  return value == null ? 0 : Number(value)
}
function catId(item: StockItem): number | null {
  return typeof item.item_category === 'object' && item.item_category ? item.item_category.id : (item.item_category as number | null)
}
function categoryName(item: StockItem): string {
  return typeof item.item_category === 'object' && item.item_category ? item.item_category.category_name : '—'
}
function locationName(item: StockItem): string {
  return typeof item.location === 'object' && item.location ? (item.location as Branch).shop_name : '—'
}

interface Row {
  raw: StockItem
  id: number
  name: string
  onHand: number
  unit: string
  reorder: number | null
  category: string
  categoryId: number | null
  location: string
  low: boolean
}

const rows = computed<Row[]>(() =>
  (data.value?.items ?? []).map((s) => {
    const onHand = num(s.item_stock_value)
    const reorder = s.reorder_level != null ? Number(s.reorder_level) : null
    return {
      raw: s,
      id: s.id,
      name: s.item_name,
      onHand,
      unit: s.unit ?? '',
      reorder,
      category: categoryName(s),
      categoryId: catId(s),
      location: locationName(s),
      low: reorder != null && onHand <= reorder,
    }
  }),
)

// Search + category filter (client-side).
const search = ref('')
const categoryFilter = ref<number | null>(null)
const lowOnly = ref(false)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (categoryFilter.value != null && r.categoryId !== categoryFilter.value) return false
    if (lowOnly.value && !r.low) return false
    if (q && !`${r.name} ${r.unit} ${r.category} ${r.location}`.toLowerCase().includes(q)) return false
    return true
  })
})

// Dialogs
const formVisible = ref(false)
const editing = ref<StockItem | null>(null)
function openCreate() {
  editing.value = null
  formVisible.value = true
}
function openEdit(item: StockItem) {
  editing.value = item
  formVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<StockItem | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')
const { deleteStockItem } = useInventory()

function askDelete(item: StockItem) {
  deleting.value = item
  deleteError.value = ''
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteStockItem(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete. It may be referenced by products or usage.'
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
        <h1 class="text-xl font-semibold text-slate-900">Stock items</h1>
        <p class="mt-1 text-sm text-slate-500">Quantity-tracked items (consumables, materials, anything on hand).</p>
      </div>
      <Button icon="pi pi-plus" label="Add item" class="self-start" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load stock items.</Message>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search items" fluid />
      </IconField>
      <Select
        v-model="categoryFilter"
        :options="categories"
        option-label="category_name"
        option-value="id"
        show-clear
        placeholder="All categories"
        class="w-full sm:w-56"
      />
      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="lowOnly" input-id="lowOnly" />
        <label for="lowOnly" class="text-sm text-slate-600">Low stock only</label>
      </div>
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
        :pt="{ table: { class: 'min-w-[44rem]' } }"
      >
        <template #empty>
          <span class="text-sm text-slate-500">No stock items.</span>
        </template>
      <Column field="name" header="Item" sortable>
        <template #body="{ data: row }">
          <NuxtLink :to="`/inventory/stock/${row.id}`" class="text-slate-900 hover:underline">{{ row.name }}</NuxtLink>
        </template>
      </Column>
      <Column field="onHand" header="On hand" sortable>
        <template #body="{ data: row }">
          <span :class="row.low ? 'font-medium text-red-600' : 'text-slate-700'">
            {{ row.onHand }} <span class="text-slate-400">{{ row.unit }}</span>
          </span>
          <Tag v-if="row.low" value="Low" severity="danger" class="ml-2" />
        </template>
      </Column>
      <Column field="reorder" header="Reorder at" sortable>
        <template #body="{ data: row }">
          <span class="text-slate-600">{{ row.reorder != null ? row.reorder : '—' }}</span>
        </template>
      </Column>
      <Column field="category" header="Category" sortable />
      <Column field="location" header="Location" sortable />
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

    <InventoryStockItemForm
      v-model:visible="formVisible"
      :item="editing"
      :categories="categories"
      :branches="branches"
      @saved="refresh"
    />
    <InventoryConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete stock item"
      :message="deleting ? `Delete “${deleting.item_name}”? This cannot be undone.` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
