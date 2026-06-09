import { directusUser } from '../../../utils/directus-user'

interface StockItemBody {
  item_name?: string | null
  item_stock_value?: number | string | null
  unit?: string | null
  reorder_level?: number | string | null
  item_category?: number | null
  location?: number | string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<StockItemBody>(event)
  if (!body?.item_name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Item name is required.' })
  }
  const item = await directusUser(event, '/items/media_inventory', {
    method: 'POST',
    body: {
      item_name: body.item_name.trim(),
      item_stock_value: body.item_stock_value ?? 0,
      unit: body.unit ?? null,
      reorder_level: body.reorder_level ?? null,
      item_category: body.item_category ?? null,
      location: body.location ?? null,
    },
  })
  return { item }
})
