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

export default defineEventHandler(async (event) => {
  const body = await readBody<OrderBody>(event)
  if (!body?.partner_id) {
    throw createError({ statusCode: 422, statusMessage: 'A customer is required.' })
  }

  const created = await directusUser<{ id: number }>(event, '/items/orders', {
    method: 'POST',
    body: {
      partner_id: body.partner_id,
      sales_employee: body.sales_employee ?? null,
      tax: body.tax ?? 0,
      discount: body.discount ?? null,
      downpayment: body.downpayment ?? null,
      shipping_address: body.shipping_address ?? null,
      remarks: body.remarks ?? null,
      paid: body.paid ?? false,
      shipped: body.shipped ?? false,
      completed: body.completed ?? false,
      total: 0,
    },
  })

  // No lines yet, but tax/discount may be set → keep total consistent.
  await recalcOrderTotal(event, created.id)
  return { item: created }
})
