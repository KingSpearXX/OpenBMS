import type {
  Supplier,
  ProcurementOrder,
  ProcurementOrderWithLines,
  ProcurementLine,
  CatalogItem,
} from '~/types/procurement'

export interface SupplierInput {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  status?: 'active' | 'inactive'
}

export interface ProcurementOrderInput {
  supplier: number
  order_date?: string | null
  notes?: string | null
}

export interface LineInput {
  item_name: string
  sku?: string | null
  quantity: number | string
  unit?: string | null
  unit_cost?: number | string | null
  notes?: string | null
  product?: number | null
  inventory_item?: number | null
}

export function useSuppliers() {
  return {
    listSuppliers: (params?: { search?: string; status?: string }) =>
      $fetch<{ items: Supplier[] }>('/api/procurement/suppliers', { query: params }),

    getSupplier: (id: number) =>
      $fetch<{ item: Supplier }>(`/api/procurement/suppliers/${id}`),

    createSupplier: (body: SupplierInput) =>
      $fetch<{ item: Supplier }>('/api/procurement/suppliers', { method: 'POST', body }),

    updateSupplier: (id: number, body: Partial<SupplierInput>) =>
      $fetch<{ item: Supplier }>(`/api/procurement/suppliers/${id}`, { method: 'PATCH', body }),

    deleteSupplier: (id: number) =>
      $fetch(`/api/procurement/suppliers/${id}`, { method: 'DELETE' }),
  }
}

export function useProcurement() {
  return {
    listOrders: (params?: { status?: string; supplier?: number; from?: string; to?: string }) =>
      $fetch<{ items: (ProcurementOrder & { lines: { id: number }[] })[] }>('/api/procurement', { query: params }),

    getOrder: (id: number) =>
      $fetch<{ item: ProcurementOrderWithLines }>(`/api/procurement/${id}`),

    createOrder: (body: ProcurementOrderInput) =>
      $fetch<{ item: ProcurementOrder }>('/api/procurement', { method: 'POST', body }),

    updateOrder: (id: number, body: Partial<ProcurementOrderInput> & { status?: string }) =>
      $fetch<{ item: ProcurementOrder }>(`/api/procurement/${id}`, { method: 'PATCH', body }),

    deleteOrder: (id: number) =>
      $fetch(`/api/procurement/${id}`, { method: 'DELETE' }),

    // Lines
    addLine: (orderId: number, body: LineInput) =>
      $fetch<{ item: ProcurementLine }>(`/api/procurement/${orderId}/lines`, { method: 'POST', body }),

    updateLine: (orderId: number, lineId: number, body: Partial<LineInput>) =>
      $fetch<{ item: ProcurementLine }>(`/api/procurement/${orderId}/lines/${lineId}`, { method: 'PATCH', body }),

    deleteLine: (orderId: number, lineId: number) =>
      $fetch(`/api/procurement/${orderId}/lines/${lineId}`, { method: 'DELETE' }),

    // CSV export — navigates to the endpoint; browser handles the download.
    exportCsv: (orderId: number) => {
      window.open(`/api/procurement/${orderId}/export`, '_blank')
    },

    // Catalog search (merges products + inventory items)
    searchCatalog: (search?: string) =>
      $fetch<{ items: CatalogItem[] }>('/api/procurement/catalog', { query: search ? { search } : {} }),
  }
}
