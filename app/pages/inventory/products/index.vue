<script setup lang="ts">
import type { Category, Product, StockItem } from '~/types/inventory'

const { data, pending, error, refresh } = await useFetch<{ items: Product[] }>('/api/inventory/products')
const { data: catData } = await useFetch<{ items: Category[] }>('/api/inventory/categories')
const { data: stockData } = await useFetch<{ items: StockItem[] }>('/api/inventory/stock-items')

const categories = computed(() => catData.value?.items ?? [])
const stockItems = computed(() => stockData.value?.items ?? [])

function catId(p: Product): number | null {
  return typeof p.category === 'object' && p.category ? p.category.id : (p.category as number | null)
}
function categoryName(p: Product): string {
  return typeof p.category === 'object' && p.category ? p.category.category_name : '—'
}
function stockName(p: Product): string {
  return typeof p.inventory_id === 'object' && p.inventory_id
    ? (p.inventory_id as Pick<StockItem, 'id' | 'item_name'>).item_name
    : '—'
}

interface Row {
  raw: Product
  id: number
  sku: string
  name: string
  price: number | null
  category: string
  categoryId: number | null
  stock: string
}

const rows = computed<Row[]>(() =>
  (data.value?.items ?? []).map(p => ({
    raw: p,
    id: p.id,
    sku: p.sku ?? '',
    name: p.name ?? '(unnamed)',
    price: p.unit_price != null ? Number(p.unit_price) : null,
    category: categoryName(p),
    categoryId: catId(p),
    stock: stockName(p),
  })),
)

const search = ref('')
const categoryFilter = ref<number | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (categoryFilter.value != null && r.categoryId !== categoryFilter.value) return false
    if (q && !`${r.sku} ${r.name} ${r.category} ${r.stock}`.toLowerCase().includes(q)) return false
    return true
  })
})

function money(value: number | null): string {
  return value == null ? '—' : formatCurrency(value)
}

const formVisible = ref(false)
const editing = ref<Product | null>(null)
function openCreate() {
  editing.value = null
  formVisible.value = true
}
function openEdit(p: Product) {
  editing.value = p
  formVisible.value = true
}

const deleteVisible = ref(false)
const deleting = ref<Product | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')
const { deleteProduct } = useInventory()

function askDelete(p: Product) {
  deleting.value = p
  deleteError.value = ''
  deleteVisible.value = true
}
async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  try {
    await deleteProduct(deleting.value.id)
    deleteVisible.value = false
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    deleteError.value = err?.data?.statusMessage || 'Could not delete product.'
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
        <h1 class="text-xl font-semibold text-slate-900">Products</h1>
        <p class="mt-1 text-sm text-slate-500">Sellable catalog used by orders &amp; POS.</p>
      </div>
      <Button icon="pi pi-plus" label="Add product" class="self-start" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load products.</Message>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <IconField class="grow sm:grow-0">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Search products" fluid />
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
          <span class="text-sm text-slate-500">No products.</span>
        </template>
      <Column field="sku" header="SKU" sortable>
        <template #body="{ data: row }"><span class="text-slate-500">{{ row.sku || '—' }}</span></template>
      </Column>
      <Column field="name" header="Name" sortable>
        <template #body="{ data: row }">
          <NuxtLink :to="`/inventory/products/${row.id}`" class="text-slate-900 hover:underline">{{ row.name }}</NuxtLink>
        </template>
      </Column>
      <Column field="price" header="Price" sortable>
        <template #body="{ data: row }">{{ money(row.price) }}</template>
      </Column>
      <Column field="category" header="Category" sortable />
      <Column field="stock" header="Linked stock" sortable />
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

    <InventoryProductForm
      v-model:visible="formVisible"
      :product="editing"
      :categories="categories"
      :stock-items="stockItems"
      @saved="refresh"
    />
    <InventoryConfirmDelete
      v-model:visible="deleteVisible"
      title="Delete product"
      :message="deleting ? `Delete “${deleting.name || 'this product'}”? This cannot be undone.` : ''"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
    <Message v-if="deleteError" severity="error" :closable="true" class="mt-3">{{ deleteError }}</Message>
  </div>
</template>
