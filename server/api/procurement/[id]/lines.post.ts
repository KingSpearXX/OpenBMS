import { directusUser } from '../../../utils/directus-user'

interface LineBody {
  item_name?: string | null
  sku?: string | null
  quantity?: number | string | null
  unit?: string | null
  unit_cost?: number | string | null
  notes?: string | null
  product?: number | null
  inventory_item?: number | null
}

export default defineEventHandler(async (event) => {
  const orderId = Number(getRouterParam(event, 'id'))
  const body = await readBody<LineBody>(event)

  if (!body?.item_name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Item name is required.' })
  }
  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Quantity must be greater than zero.' })
  }

  const item = await directusUser(event, '/items/procurement_lines', {
    method: 'POST',
    body: {
      order_id: orderId,
      item_name: body.item_name.trim(),
      sku: body.sku?.trim() || null,
      quantity,
      unit: body.unit || null,
      unit_cost: body.unit_cost != null ? Number(body.unit_cost) || null : null,
      notes: body.notes?.trim() || null,
      product: body.product ?? null,
      inventory_item: body.inventory_item ?? null,
    },
  })
  return { item }
})
