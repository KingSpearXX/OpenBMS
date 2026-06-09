import type { Category, Branch, Product, StockItem } from '~/types/inventory'

// Client wrapper over the authenticated BFF inventory endpoints. Mutations run in the
// browser (same-origin cookies carry the session); the BFF attaches the Directus token.

export interface ProductInput {
  sku?: string | null
  name: string
  description?: string | null
  unit_price?: number | null
  category?: number | null
  inventory_id?: number | null
}

export interface StockItemInput {
  item_name: string
  item_stock_value?: number | null
  unit?: string | null
  reorder_level?: number | null
  item_category?: number | null
  location?: number | string | null
}

export interface UsageInput {
  item: number
  used: number
  allowNegative?: boolean
}

export function useInventory() {
  return {
    // Lookups
    fetchCategories: () =>
      $fetch<{ items: Category[] }>('/api/inventory/categories').then(r => r.items),
    fetchBranches: () =>
      $fetch<{ items: Branch[] }>('/api/inventory/branches').then(r => r.items),
    fetchStockItems: () =>
      $fetch<{ items: StockItem[] }>('/api/inventory/stock-items').then(r => r.items),

    // Products
    createProduct: (body: ProductInput) =>
      $fetch<{ item: Product }>('/api/inventory/products', { method: 'POST', body }),
    updateProduct: (id: number, body: Partial<ProductInput>) =>
      $fetch<{ item: Product }>(`/api/inventory/products/${id}`, { method: 'PATCH', body }),
    deleteProduct: (id: number) =>
      $fetch(`/api/inventory/products/${id}`, { method: 'DELETE' }),

    // Stock items
    createStockItem: (body: StockItemInput) =>
      $fetch<{ item: StockItem }>('/api/inventory/stock-items', { method: 'POST', body }),
    updateStockItem: (id: number, body: Partial<StockItemInput>) =>
      $fetch<{ item: StockItem }>(`/api/inventory/stock-items/${id}`, { method: 'PATCH', body }),
    deleteStockItem: (id: number) =>
      $fetch(`/api/inventory/stock-items/${id}`, { method: 'DELETE' }),

    // Usage (BFF deducts/restores stock)
    logUsage: (body: UsageInput) =>
      $fetch('/api/inventory/usage', { method: 'POST', body }),
    updateUsage: (id: number, body: { used: number, allowNegative?: boolean }) =>
      $fetch(`/api/inventory/usage/${id}`, { method: 'PATCH', body }),
    deleteUsage: (id: number) =>
      $fetch(`/api/inventory/usage/${id}`, { method: 'DELETE' }),
  }
}
