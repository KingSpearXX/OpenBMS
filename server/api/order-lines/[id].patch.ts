import { directusUser } from '../../utils/directus-user'
import { computeLineTotal, junctionByLine, orderLinesHasProduct, recalcOrderTotal } from '../../utils/orders'

interface LineBody {
  product_name?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  discount?: number | string | null
  product?: number | null
}

interface ExistingLine {
  quantity: number | string | null
  unit_price: number | string | null
  discount: number | string | null
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<LineBody>(event)

  const existing = await directusUser<ExistingLine>(event, `/items/order_lines/${id}`, {
    query: { fields: 'quantity,unit_price,discount' },
  })

  const patch: Record<string, unknown> = {}
  if (typeof body?.product_name === 'string') patch.product_name = body.product_name.trim()
  if ('quantity' in (body ?? {})) patch.quantity = Number(body.quantity)
  if ('unit_price' in (body ?? {})) patch.unit_price = body.unit_price
  if ('discount' in (body ?? {})) patch.discount = body.discount
  if ('product' in (body ?? {}) && (await orderLinesHasProduct(event))) patch.product = body.product

  // Recompute line_total from the merged values.
  const quantity = 'quantity' in patch ? patch.quantity : existing.quantity
  const unitPrice = 'unit_price' in patch ? patch.unit_price : existing.unit_price
  const discount = 'discount' in patch ? patch.discount : existing.discount
  patch.line_total = computeLineTotal(
    quantity as number | string | null,
    unitPrice as number | string | null,
    discount as number | string | null,
  )

  const item = await directusUser(event, `/items/order_lines/${id}`, { method: 'PATCH', body: patch })

  // Recompute the owning order's total (resolved via the junction).
  const links = await junctionByLine(event, id)
  const orderId = links[0]?.orders_id
  if (orderId != null) await recalcOrderTotal(event, orderId)

  return { item }
})
