import type { H3Event } from 'h3'
import { directusUser } from './directus-user'
import { adjustStock } from './inventory'

// POS sales are stored in `shop_sales` (unified with the existing sales analysis). The BFF
// maps app field names ↔ shop_sales columns:
//   amount         → sales_total      (the entry's total amount)
//   payment_method → sales_type       (cash | bank_transfer)
//   sales_branch   → sales_branch
// plus added columns product_name / quantity / unit_price / sold_at / product.
// Money/qty come back from Directus as strings → coerce with Number(). 2dp amounts.

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeAmount(
  unitPrice: number | string | null | undefined,
  quantity: number | string | null | undefined,
): number {
  const price = Number(unitPrice) || 0
  const qty = Number(quantity)
  return round2(price * (Number.isFinite(qty) ? qty : 1))
}

// `shop_sales.product` (m2o → products) is optional. Detect once (cached per process) so we
// only write the FK when the column exists; product_name always carries the item.
const fieldCache = new Map<string, Set<string>>()

async function collectionFields(event: H3Event, collection: string): Promise<Set<string>> {
  const cached = fieldCache.get(collection)
  if (cached) return cached
  try {
    const fields = await directusUser<{ field: string }[]>(event, `/fields/${collection}`, {
      query: { limit: -1 },
    })
    const set = new Set((fields ?? []).map(f => f.field))
    fieldCache.set(collection, set)
    return set
  }
  catch {
    return new Set<string>()
  }
}

export async function shopSalesHasProduct(event: H3Event): Promise<boolean> {
  return (await collectionFields(event, 'shop_sales')).has('product')
}

// Resolve a product's linked stock item (products.inventory_id → media_inventory).
async function productStockItem(event: H3Event, productId: number): Promise<number | null> {
  try {
    const p = await directusUser<{ inventory_id: number | { id: number } | null }>(
      event,
      `/items/products/${productId}`,
      { query: { fields: 'inventory_id' } },
    )
    const inv = p?.inventory_id
    if (inv == null) return null
    return typeof inv === 'object' ? (inv as { id: number }).id : Number(inv)
  }
  catch {
    return null
  }
}

// Apply a stock change for a POS sale of `productId`: `delta` is added to the linked stock
// item's on-hand (negative deducts, positive restores). 1:1 with sold quantity (no unit
// conversion), negative allowed. Best-effort — a sale must never be blocked by stock.
export async function posStockDelta(
  event: H3Event,
  productId: number | null | undefined,
  delta: number,
): Promise<void> {
  if (productId == null || !Number.isFinite(delta) || delta === 0) return
  try {
    const itemId = await productStockItem(event, Number(productId))
    if (itemId != null) await adjustStock(event, itemId, delta)
  }
  catch {
    /* best-effort: never block the sale on a stock-movement failure */
  }
}

// Map a raw shop_sales row to the app's PosSale shape.
export function mapSale(row: Record<string, unknown>) {
  return {
    id: row.id,
    sold_at: row.sold_at ?? null,
    product_name: row.product_name ?? null,
    unit_price: row.unit_price ?? null,
    quantity: row.quantity ?? null,
    amount: row.sales_total ?? null,
    payment_method: row.sales_type ?? null,
    sales_branch: row.sales_branch ?? null,
    product: row.product ?? null,
  }
}
