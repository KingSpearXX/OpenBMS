import { directusUser } from '../../../utils/directus-user'
import { computeAmount, mapSale, posStockDelta, shopSalesHasProduct } from '../../../utils/pos'

interface SaleBody {
  product_name?: string | null
  unit_price?: number | string | null
  quantity?: number | string | null
  payment_method?: string | null
  sales_branch?: string | null
  sold_at?: string | null
  product?: number | null
}

interface ExistingSale {
  unit_price: number | string | null
  quantity: number | string | null
  product?: number | null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<SaleBody>(event)
  const hasProduct = await shopSalesHasProduct(event)

  const existing = await directusUser<ExistingSale>(event, `/items/shop_sales/${id}`, {
    query: { fields: hasProduct ? 'unit_price,quantity,product' : 'unit_price,quantity' },
  })

  const patch: Record<string, unknown> = {}
  if (typeof body?.product_name === 'string') patch.product_name = body.product_name.trim()
  if ('unit_price' in (body ?? {})) patch.unit_price = body.unit_price
  if ('quantity' in (body ?? {})) patch.quantity = body.quantity
  if ('payment_method' in (body ?? {})) patch.sales_type = body.payment_method
  if ('sales_branch' in (body ?? {})) patch.sales_branch = body.sales_branch
  if ('sold_at' in (body ?? {})) patch.sold_at = body.sold_at
  if ('product' in (body ?? {}) && hasProduct) patch.product = body.product

  // Recompute the entry total (sales_total) from merged price/qty.
  const unitPrice = 'unit_price' in patch ? patch.unit_price : existing.unit_price
  const quantity = 'quantity' in patch ? patch.quantity : existing.quantity
  patch.sales_total = computeAmount(unitPrice as number | string | null, quantity as number | string | null)

  const updated = await directusUser<Record<string, unknown>>(event, `/items/shop_sales/${id}`, { method: 'PATCH', body: patch })

  // Stock reconciliation: restore the old consumption, apply the new (handles qty and
  // product changes uniformly). Net-zero when neither changed.
  if (hasProduct) {
    const oldProduct = existing.product ?? null
    const oldQty = Number(existing.quantity) || 0
    const newProduct = 'product' in (body ?? {}) ? (body.product ?? null) : oldProduct
    const newQty = 'quantity' in (body ?? {}) ? (Number(body.quantity) || 0) : oldQty
    await posStockDelta(event, oldProduct, oldQty)
    await posStockDelta(event, newProduct, -newQty)
  }

  return { item: mapSale(updated) }
})
