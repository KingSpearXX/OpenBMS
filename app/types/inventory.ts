// Directus returns numeric/decimal columns as strings (to preserve precision), so quantity
// and price fields are typed as `number | string | null` and coerced in the UI.

export interface Category {
  id: number
  category_name: string
  category_description?: string | null
}

export interface Branch {
  id: string
  shop_name: string
}

export interface StockItem {
  id: number
  item_name: string
  item_stock_value: number | string | null
  unit: string | null
  reorder_level: number | string | null
  item_category: Category | number | null
  location: Branch | number | string | null
  date_created?: string | null
  date_updated?: string | null
}

export interface Product {
  id: number
  sku: string | null
  name: string | null
  description: string | null
  unit_price: number | string | null
  category: Category | number | null
  inventory_id: Pick<StockItem, 'id' | 'item_name'> | number | null
}

export interface UsageLog {
  id: number
  item_usage_value: number | string | null
  date_created: string | null
  media_item_name: Pick<StockItem, 'id' | 'item_name'> | number | null
}
