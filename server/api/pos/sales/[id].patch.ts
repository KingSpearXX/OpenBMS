import { directusUser } from '../../../utils/directus-user'
import { computeAmount, mapSale, shopSalesHasProduct } from '../../../utils/pos'

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
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<SaleBody>(event)

  const existing = await directusUser<ExistingSale>(event, `/items/shop_sales/${id}`, {
    query: { fields: 'unit_price,quantity' },
  })

  const patch: Record<string, unknown> = {}
  if (typeof body?.product_name === 'string') patch.product_name = body.product_name.trim()
  if ('unit_price' in (body ?? {})) patch.unit_price = body.unit_price
  if ('quantity' in (body ?? {})) patch.quantity = body.quantity
  if ('payment_method' in (body ?? {})) patch.sales_type = body.payment_method
  if ('sales_branch' in (body ?? {})) patch.sales_branch = body.sales_branch
  if ('sold_at' in (body ?? {})) patch.sold_at = body.sold_at
  if ('product' in (body ?? {}) && (await shopSalesHasProduct(event))) patch.product = body.product

  // Recompute the entry total (sales_total) from merged price/qty.
  const unitPrice = 'unit_price' in patch ? patch.unit_price : existing.unit_price
  const quantity = 'quantity' in patch ? patch.quantity : existing.quantity
  patch.sales_total = computeAmount(unitPrice as number | string | null, quantity as number | string | null)

  const updated = await directusUser<Record<string, unknown>>(event, `/items/shop_sales/${id}`, { method: 'PATCH', body: patch })
  return { item: mapSale(updated) }
})
