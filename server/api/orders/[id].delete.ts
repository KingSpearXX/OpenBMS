import { directusUser } from '../../utils/directus-user'
import { junctionByOrder } from '../../utils/orders'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  // Remove the order's junction rows + their line items, then the order itself.
  const links = await junctionByOrder(event, id)
  for (const link of links) {
    await directusUser(event, `/items/orders_order_lines/${link.id}`, { method: 'DELETE' })
    if (link.order_lines_id != null) {
      await directusUser(event, `/items/order_lines/${link.order_lines_id}`, { method: 'DELETE' }).catch(() => {})
    }
  }

  await directusUser(event, `/items/orders/${id}`, { method: 'DELETE' })
  return { ok: true }
})
