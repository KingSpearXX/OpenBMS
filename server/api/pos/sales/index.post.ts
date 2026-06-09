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

export default defineEventHandler(async (event) => {
  const body = await readBody<SaleBody>(event)
  if (!body?.product_name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'A product/description is required.' })
  }

  const row: Record<string, unknown> = {
    product_name: body.product_name.trim(),
    unit_price: body.unit_price ?? 0,
    quantity: body.quantity ?? 1,
    sales_total: computeAmount(body.unit_price, body.quantity),
    sales_type: body.payment_method ?? 'cash',
    sales_branch: body.sales_branch ?? null,
    // sold_at is the editable sale time (a wall-clock dateTime); client always sends it.
    sold_at: body.sold_at ?? null,
  }
  if (body.product != null && (await shopSalesHasProduct(event))) {
    row.product = body.product
  }

  const created = await directusUser<Record<string, unknown>>(event, '/items/shop_sales', { method: 'POST', body: row })
  return { item: mapSale(created) }
})
