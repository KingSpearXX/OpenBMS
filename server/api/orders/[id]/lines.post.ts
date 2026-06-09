import { directusUser } from '../../../utils/directus-user'
import { computeLineTotal, linkLineToOrder, orderLinesHasProduct, recalcOrderTotal } from '../../../utils/orders'

interface LineBody {
  product_name?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  discount?: number | string | null
  product?: number | null
}

export default defineEventHandler(async (event) => {
  const orderId = Number(getRouterParam(event, 'id'))
  const body = await readBody<LineBody>(event)

  if (!body?.product_name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'A product/description is required.' })
  }
  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Quantity must be greater than zero.' })
  }

  const lineBody: Record<string, unknown> = {
    product_name: body.product_name.trim(),
    quantity,
    unit_price: body.unit_price ?? 0,
    discount: body.discount ?? 0,
    line_total: computeLineTotal(body.quantity, body.unit_price, body.discount),
  }
  // Link the catalog product (FK) only when the optional column exists and one was picked.
  if (body.product != null && (await orderLinesHasProduct(event))) {
    lineBody.product = body.product
  }

  const line = await directusUser<{ id: number }>(event, '/items/order_lines', {
    method: 'POST',
    body: lineBody,
  })

  // Link via the m2m junction; compensate (remove the orphan line) if linking fails.
  try {
    await linkLineToOrder(event, orderId, line.id)
  }
  catch (e) {
    await directusUser(event, `/items/order_lines/${line.id}`, { method: 'DELETE' }).catch(() => {})
    throw e
  }

  await recalcOrderTotal(event, orderId)
  return { item: line }
})
