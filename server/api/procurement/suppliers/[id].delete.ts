import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  // Guard: refuse if any orders reference this supplier.
  const linked = await directusUser<{ id: number }[]>(event, '/items/procurement_orders', {
    query: {
      filter: JSON.stringify({ supplier: { _eq: Number(id) } }),
      fields: 'id',
      limit: 1,
    },
  })
  if (linked?.length) {
    throw createError({ statusCode: 409, statusMessage: 'Cannot delete a supplier that has procurement orders.' })
  }

  await directusUser(event, `/items/suppliers/${id}`, { method: 'DELETE' })
  return { ok: true }
})
