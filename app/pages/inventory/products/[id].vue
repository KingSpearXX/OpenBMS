<script setup lang="ts">
import type { Category, Product, StockItem } from '~/types/inventory'

const route = useRoute()
const { data, error, refresh } = await useFetch<{ item: Product }>(`/api/inventory/products/${route.params.id}`)
const { data: catData } = await useFetch<{ items: Category[] }>('/api/inventory/categories')
const { data: stockData } = await useFetch<{ items: StockItem[] }>('/api/inventory/stock-items')

const product = computed(() => data.value?.item ?? null)
const categories = computed(() => catData.value?.items ?? [])
const stockItems = computed(() => stockData.value?.items ?? [])

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
function categoryName(p: Product): string {
  return typeof p.category === 'object' && p.category ? (p.category as Category).category_name : '—'
}
const linkedStock = computed<Pick<StockItem, 'id' | 'item_name'> | null>(() =>
  product.value && typeof product.value.inventory_id === 'object' ? product.value.inventory_id : null,
)

const editVisible = ref(false)
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink to="/inventory/products" class="text-sm text-slate-500 hover:underline">← Products</NuxtLink>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load this product.</Message>

    <div v-else-if="product" class="mt-3">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ product.name || '(unnamed)' }}</h1>
        <Button icon="pi pi-pencil" label="Edit" outlined size="small" class="ml-auto" @click="editVisible = true" />
      </div>

      <dl class="mt-6 grid grid-cols-3 gap-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dt class="text-slate-500">SKU</dt>
        <dd class="col-span-2 text-slate-900">{{ product.sku || '—' }}</dd>
        <dt class="text-slate-500">Price</dt>
        <dd class="col-span-2 text-slate-900">{{ money(product.unit_price) }}</dd>
        <dt class="text-slate-500">Category</dt>
        <dd class="col-span-2 text-slate-900">{{ categoryName(product) }}</dd>
        <dt class="text-slate-500">Description</dt>
        <dd class="col-span-2 text-slate-900">{{ product.description || '—' }}</dd>
        <dt class="text-slate-500">Linked stock</dt>
        <dd class="col-span-2 text-slate-900">
          <NuxtLink v-if="linkedStock" :to="`/inventory/stock/${linkedStock.id}`" class="hover:underline">
            {{ linkedStock.item_name }}
          </NuxtLink>
          <span v-else>—</span>
        </dd>
      </dl>

      <InventoryProductForm
        v-model:visible="editVisible"
        :product="product"
        :categories="categories"
        :stock-items="stockItems"
        @saved="refresh"
      />
    </div>
  </div>
</template>
