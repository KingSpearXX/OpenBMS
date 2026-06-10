import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  const and: Record<string, unknown>[] = []
  if (q.from) and.push({ date_created: { _gte: String(q.from) } })
  if (q.to) and.push({ date_created: { _lte: String(q.to) } })
  if (q.category) and.push({ expense_category: { _eq: String(q.category) } })
  if (q.branch) and.push({ branch: { _eq: String(q.branch) } })

  const query: Record<string, unknown> = {
    fields: 'id,date_created,expense_amount,expense_category,expense_description,expense_attachment,branch',
    sort: '-date_created',
    limit: -1,
  }
  if (and.length) query.filter = JSON.stringify({ _and: and })

  const items = await directusUser(event, '/items/shop_expenses', { query })
  return { items }
})
