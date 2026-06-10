import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const and: Record<string, unknown>[] = []

  if (q.status) and.push({ status: { _eq: String(q.status) } })
  if (q.supplier) and.push({ supplier: { _eq: Number(q.supplier) } })
  if (q.from) and.push({ order_date: { _gte: String(q.from) } })
  if (q.to) and.push({ order_date: { _lte: String(q.to) } })

  const query: Record<string, unknown> = {
    fields: [
      'id',
      'reference_number',
      'order_date',
      'status',
      'notes',
      'date_created',
      'supplier.id',
      'supplier.name',
      'lines.id',
    ].join(','),
    sort: '-date_created',
    limit: -1,
  }
  if (and.length) query.filter = JSON.stringify({ _and: and })

  const items = await directusUser(event, '/items/procurement_orders', { query })
  return { items }
})
