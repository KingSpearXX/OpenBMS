import { directusUser } from '../../../utils/directus-user'

interface StockItemBody {
  item_name?: string | null
  item_stock_value?: number | string | null
  unit?: string | null
  reorder_level?: number | string | null
  item_category?: number | null
  location?: number | string | null
}

const FIELDS: (keyof StockItemBody)[] = [
  'item_name',
  'item_stock_value',
  'unit',
  'reorder_level',
  'item_category',
  'location',
]

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<StockItemBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if (typeof patch.item_name === 'string') patch.item_name = (patch.item_name as string).trim()

  const item = await directusUser(event, `/items/media_inventory/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
