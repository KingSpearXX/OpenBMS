import { directusUser } from '../../../utils/directus-user'
import { mapSale, shopSalesHasProduct } from '../../../utils/pos'

// List POS sales from shop_sales, filtered server-side by sold_at range (+ branch/method).
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const hasProduct = await shopSalesHasProduct(event)

  const and: Record<string, unknown>[] = []
  if (q.from) and.push({ sold_at: { _gte: String(q.from) } })
  if (q.to) and.push({ sold_at: { _lte: String(q.to) } })
  if (q.branch) and.push({ sales_branch: { _eq: String(q.branch) } })
  if (q.method) and.push({ sales_type: { _eq: String(q.method) } })

  const fields = [
    'id',
    'sold_at',
    'product_name',
    'unit_price',
    'quantity',
    'sales_total',
    'sales_type',
    'sales_branch.id',
    'sales_branch.shop_name',
    ...(hasProduct ? ['product'] : []),
  ]

  const query: Record<string, unknown> = {
    fields: fields.join(','),
    sort: '-sold_at',
    limit: -1,
  }
  if (and.length) query.filter = JSON.stringify({ _and: and })

  const rows = await directusUser<Record<string, unknown>[]>(event, '/items/shop_sales', { query })
  return { items: (rows ?? []).map(mapSale) }
})
