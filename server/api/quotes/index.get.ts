import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const and: Record<string, unknown>[] = []

  if (q.status) and.push({ status: { _eq: String(q.status) } })
  if (q.customer) and.push({ customer: { _eq: Number(q.customer) } })
  if (q.from) and.push({ quote_date: { _gte: String(q.from) } })
  if (q.to) and.push({ expiration_date: { _lte: String(q.to) } })

  const query: Record<string, unknown> = {
    fields: [
      'id',
      'status',
      'quote_date',
      'expiration_date',
      'subtotal',
      'discount_percent',
      'discount_amount',
      'tax_percent',
      'tax_amount',
      'total',
      'notes',
      'date_created',
      'customer.id',
      'customer.partner_name',
      'lines.id',
    ].join(','),
    sort: '-date_created',
    limit: -1,
  }
  if (and.length) query.filter = JSON.stringify({ _and: and })

  const items = await directusUser(event, '/items/quotes', { query })
  return { items }
})
