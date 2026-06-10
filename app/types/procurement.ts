// Directus returns decimal columns as strings — quantity/cost fields typed accordingly.

export interface Supplier {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  status: 'active' | 'inactive'
  date_created?: string | null
}

export interface ProcurementLine {
  id: number
  order_id: number | null
  product: number | null
  inventory_item: number | null
  item_name: string
  sku: string | null
  quantity: number | string
  unit: string | null
  unit_cost: number | string | null
  notes: string | null
}

export interface ProcurementOrder {
  id: number
  reference_number: string | null
  supplier: Supplier | number | null
  order_date: string | null
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  notes: string | null
  date_created?: string | null
  date_updated?: string | null
}

export interface ProcurementOrderWithLines extends Omit<ProcurementOrder, 'supplier'> {
  supplier: Supplier | null
  lines: ProcurementLine[]
}

// Merged result from the catalog search endpoint (products + inventory items).
export interface CatalogItem {
  type: 'product' | 'inventory'
  id: number
  name: string
  sku: string | null
  unit: string | null
  unit_cost: number | string | null
}
