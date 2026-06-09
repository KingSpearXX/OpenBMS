import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const customer = q.customer ? Number(q.customer) : null

  const query: Record<string, unknown> = {
    // sales_employee left unexpanded (it's a directus_users m2o) to avoid coupling the
    // list to directus_users read permission; resolved by name via /api/orders/employees.
    fields: 'id,total,tax,paid,shipped,completed,order_date,partner_id.id,partner_id.partner_name',
    sort: '-order_date',
    limit: -1,
  }
  if (customer) {
    query.filter = JSON.stringify({ partner_id: { _eq: customer } })
  }

  const items = await directusUser(event, '/items/orders', { query })
  return { items }
})
