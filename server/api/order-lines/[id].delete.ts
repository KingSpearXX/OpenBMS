import { directusUser } from '../../utils/directus-user'
import { junctionByLine, recalcOrderTotal } from '../../utils/orders'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  // Remove junction rows first, then the line; recompute affected orders.
  const links = await junctionByLine(event, id)
  for (const link of links) {
    await directusUser(event, `/items/orders_order_lines/${link.id}`, { method: 'DELETE' })
  }
  await directusUser(event, `/items/order_lines/${id}`, { method: 'DELETE' })

  const orderIds = [...new Set(links.map(l => l.orders_id).filter((v): v is number => v != null))]
  for (const orderId of orderIds) {
    await recalcOrderTotal(event, orderId)
  }
  return { ok: true }
})
