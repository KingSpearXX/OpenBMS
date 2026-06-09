import { directusUser } from '../../../utils/directus-user'
import { posStockDelta, shopSalesHasProduct } from '../../../utils/pos'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const hasProduct = await shopSalesHasProduct(event)

  // Read what was sold before deleting, so we can restore the stock it consumed.
  let product: number | null = null
  let qty = 0
  if (hasProduct) {
    const existing = await directusUser<{ product?: number | null, quantity: number | string | null }>(
      event,
      `/items/shop_sales/${id}`,
      { query: { fields: 'product,quantity' } },
    )
    product = existing?.product ?? null
    qty = Number(existing?.quantity) || 0
  }

  await directusUser(event, `/items/shop_sales/${id}`, { method: 'DELETE' })

  if (hasProduct) {
    await posStockDelta(event, product, qty)
  }
  return { ok: true }
})
