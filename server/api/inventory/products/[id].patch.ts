import { directusUser } from '../../../utils/directus-user'

interface ProductBody {
  sku?: string | null
  name?: string | null
  description?: string | null
  unit_price?: number | string | null
  category?: number | null
  inventory_id?: number | null
}

const FIELDS: (keyof ProductBody)[] = ['sku', 'name', 'description', 'unit_price', 'category', 'inventory_id']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<ProductBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if (typeof patch.name === 'string') patch.name = (patch.name as string).trim()

  const item = await directusUser(event, `/items/products/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
