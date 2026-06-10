import { directusUser } from '../../../../utils/directus-user'

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

const FIELDS: (keyof LineBody)[] = ['item_name', 'sku', 'quantity', 'unit', 'unit_cost', 'notes', 'product', 'inventory_item']

export default defineEventHandler(async (event) => {
  const lineId = getRouterParam(event, 'lineId')
  const body = await readBody<LineBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if ('item_name' in patch) {
    patch.item_name = (patch.item_name as string)?.trim() || null
    if (!patch.item_name) throw createError({ statusCode: 422, statusMessage: 'Item name is required.' })
  }
  if ('quantity' in patch) {
    const qty = Number(patch.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      throw createError({ statusCode: 422, statusMessage: 'Quantity must be greater than zero.' })
    }
    patch.quantity = qty
  }
  if ('unit_cost' in patch && patch.unit_cost != null) {
    patch.unit_cost = Number(patch.unit_cost) || null
  }

  const item = await directusUser(event, `/items/procurement_lines/${lineId}`, { method: 'PATCH', body: patch })
  return { item }
})
