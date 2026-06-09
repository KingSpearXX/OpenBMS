import { directusUser } from '../../../utils/directus-user'
import { orderLinesHasProduct } from '../../../utils/orders'

// Read an order's lines through the orders_order_lines m2m junction (canonical link).
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const hasProduct = await orderLinesHasProduct(event)

  const lineFields = [
    'order_lines_id.id',
    'order_lines_id.product_name',
    'order_lines_id.quantity',
    'order_lines_id.unit_price',
    'order_lines_id.discount',
    'order_lines_id.line_total',
    ...(hasProduct ? ['order_lines_id.product'] : []),
  ]

  const rows = await directusUser<{ order_lines_id: Record<string, unknown> | null }[]>(
    event,
    '/items/orders_order_lines',
    {
      query: {
        filter: JSON.stringify({ orders_id: { _eq: id } }),
        fields: lineFields.join(','),
        sort: 'id',
        limit: -1,
      },
    },
  )

  const items = (rows ?? [])
    .map(r => r.order_lines_id)
    .filter((l): l is Record<string, unknown> => !!l)
  return { items }
})
