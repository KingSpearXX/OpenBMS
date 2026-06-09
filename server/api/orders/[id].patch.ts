import { directusUser } from '../../utils/directus-user'
import { recalcOrderTotal } from '../../utils/orders'

interface OrderBody {
  partner_id?: number | null
  sales_employee?: string | null
  tax?: number | string | null
  discount?: string | null
  downpayment?: number | string | null
  shipping_address?: string | null
  remarks?: string | null
  paid?: boolean
  shipped?: boolean
  completed?: boolean
}

const FIELDS: (keyof OrderBody)[] = [
  'partner_id',
  'sales_employee',
  'tax',
  'discount',
  'downpayment',
  'shipping_address',
  'remarks',
  'paid',
  'shipped',
  'completed',
]

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<OrderBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }

  const item = await directusUser(event, `/items/orders/${id}`, { method: 'PATCH', body: patch })

  // tax/discount may have changed → recompute total from lines.
  if ('tax' in patch || 'discount' in patch) {
    await recalcOrderTotal(event, Number(id))
  }
  return { item }
})
