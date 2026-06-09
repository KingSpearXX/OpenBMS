import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const customer = q.customer ? Number(q.customer) : null

  const query: Record<string, unknown> = {
    fields: 'id,contact_name,contact_address,contact_number,contact_email,partner_id',
    sort: 'contact_name',
    limit: -1,
  }
  if (customer) {
    query.filter = JSON.stringify({ partner_id: { _eq: customer } })
  }

  const items = await directusUser(event, '/items/contacts', { query })
  return { items }
})
