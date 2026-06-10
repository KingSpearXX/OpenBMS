import { directusUser } from '../../utils/directus-user'
import { generatePoNumber } from '../../utils/procurement'

interface OrderBody {
  supplier?: number | null
  order_date?: string | null
  notes?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<OrderBody>(event)
  if (!body?.supplier) {
    throw createError({ statusCode: 422, statusMessage: 'A supplier is required.' })
  }

  const reference_number = await generatePoNumber(event)

  const item = await directusUser(event, '/items/procurement_orders', {
    method: 'POST',
    body: {
      reference_number,
      supplier: body.supplier,
      order_date: body.order_date ?? new Date().toISOString().slice(0, 10),
      status: 'draft',
      notes: body.notes?.trim() || null,
    },
  })
  return { item }
})
