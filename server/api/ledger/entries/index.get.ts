import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  if (!q.branch) return { items: [] }

  const and: Record<string, unknown>[] = [{ branch: { _eq: String(q.branch) } }]
  if (q.from) and.push({ entry_date: { _gte: String(q.from) } })
  if (q.to) and.push({ entry_date: { _lte: String(q.to) } })

  const items = await directusUser(event, '/items/shop_ledger', {
    query: {
      fields: 'id,entry_date,branch,direction,amount,description,category,reference,date_created',
      sort: 'entry_date,date_created',
      limit: -1,
      filter: JSON.stringify({ _and: and }),
    },
  })
  return { items }
})
