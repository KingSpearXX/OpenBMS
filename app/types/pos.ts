import type { Branch } from '~/types/inventory'

// Money/qty come back from Directus as strings → typed `number | string | null`, coerced in UI.

export type PaymentMethod = 'cash' | 'deposit'

export interface PosSale {
  // shop_sales has a UUID primary key.
  id: string
  sold_at: string | null
  product_name: string | null
  unit_price: number | string | null
  quantity: number | string | null
  amount: number | string | null
  payment_method: PaymentMethod | string | null
  sales_branch: Pick<Branch, 'id' | 'shop_name'> | string | null
  // Optional FK to products (present only if the pos_sales.product column exists).
  product?: number | null
}
