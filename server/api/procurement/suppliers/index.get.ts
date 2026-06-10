import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const query: Record<string, unknown> = {
    fields: 'id,name,email,phone,address,notes,status,date_created',
    sort: 'name',
    limit: -1,
  }
  if (q.search) {
    query.search = String(q.search)
  }
  if (q.status) {
    query.filter = JSON.stringify({ status: { _eq: String(q.status) } })
  }
  const items = await directusUser(event, '/items/suppliers', { query })
  return { items }
})
