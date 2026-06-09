<script setup lang="ts">
import type { Branch, Category, StockItem, UsageLog } from '~/types/inventory'

const route = useRoute()
const id = route.params.id

const { data: stockData, error, refresh: refreshStock } = await useFetch<{ item: StockItem }>(`/api/inventory/stock-items/${id}`)
const { data: usageData, refresh: refreshUsage } = await useFetch<{ items: UsageLog[] }>('/api/inventory/usage', { query: { item: id } })
const { data: catData } = await useFetch<{ items: Category[] }>('/api/inventory/categories')
const { data: branchData } = await useFetch<{ items: Branch[] }>('/api/inventory/branches')

const item = computed(() => stockData.value?.item ?? null)
const categories = computed(() => catData.value?.items ?? [])
const branches = computed(() => branchData.value?.items ?? [])

function onHand(s: StockItem): number {
  return s.item_stock_value == null ? 0 : Number(s.item_stock_value)
}
function isLow(s: StockItem): boolean {
  return s.reorder_level != null && onHand(s) <= Number(s.reorder_level)
}
function categoryName(s: StockItem): string {
  return typeof s.item_category === 'object' && s.item_category ? (s.item_category as Category).category_name : '—'
}
function locationName(s: StockItem): string {
  return typeof s.location === 'object' && s.location ? (s.location as Branch).shop_name : '—'
}

const editVisible = ref(false)
const usageVisible = ref(false)

async function afterChange() {
  await Promise.all([refreshStock(), refreshUsage()])
}
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink to="/inventory" class="text-sm text-slate-500 hover:underline">← Stock items</NuxtLink>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load this stock item.</Message>

    <div v-else-if="item" class="mt-3">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ item.item_name }}</h1>
        <Tag v-if="isLow(item)" value="Low stock" severity="danger" />
        <div class="ml-auto flex gap-2">
          <Button icon="pi pi-pencil" label="Edit" outlined size="small" @click="editVisible = true" />
          <Button icon="pi pi-minus-circle" label="Log usage" size="small" @click="usageVisible = true" />
        </div>
      </div>

      <dl class="mt-6 grid grid-cols-3 gap-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dt class="text-slate-500">On hand</dt>
        <dd class="col-span-2 text-slate-900">{{ onHand(item) }} {{ item.unit || '' }}</dd>
        <dt class="text-slate-500">Reorder level</dt>
        <dd class="col-span-2 text-slate-900">{{ item.reorder_level != null ? Number(item.reorder_level) : '—' }}</dd>
        <dt class="text-slate-500">Category</dt>
        <dd class="col-span-2 text-slate-900">{{ categoryName(item) }}</dd>
        <dt class="text-slate-500">Location</dt>
        <dd class="col-span-2 text-slate-900">{{ locationName(item) }}</dd>
      </dl>

      <h2 class="mt-8 text-sm font-semibold text-slate-900">Usage history</h2>
      <div class="mt-3 overflow-x-auto">
        <DataTable
          :value="usageData?.items ?? []"
          data-key="id"
          striped-rows
          paginator
          :rows="10"
          :paginator-template="{
            '640px': 'PrevPageLink CurrentPageReport NextPageLink',
            '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
            default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
          }"
          current-page-report-template="{currentPage} / {totalPages}"
        >
          <template #empty>
            <span class="text-sm text-slate-500">No usage logged yet.</span>
          </template>
        <Column header="When">
          <template #body="{ data: row }">
            <span class="text-slate-700">{{ row.date_created ? formatDate(row.date_created) : '—' }}</span>
          </template>
        </Column>
        <Column header="Used">
          <template #body="{ data: row }">
            {{ row.item_usage_value != null ? Number(row.item_usage_value) : '—' }} {{ item.unit || '' }}
          </template>
        </Column>
        </DataTable>
      </div>

      <InventoryStockItemForm
        v-model:visible="editVisible"
        :item="item"
        :categories="categories"
        :branches="branches"
        @saved="afterChange"
      />
      <InventoryUsageLogDialog
        v-model:visible="usageVisible"
        :stock-items="item ? [item] : []"
        :locked-item="item.id"
        @saved="afterChange"
      />
    </div>
  </div>
</template>
