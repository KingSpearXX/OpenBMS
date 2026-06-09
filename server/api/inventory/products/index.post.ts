import { directusUser } from '../../../utils/directus-user'

interface ProductBody {
  sku?: string | null
  name?: string | null
  description?: string | null
  unit_price?: number | string | null
  category?: number | null
  inventory_id?: number | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ProductBody>(event)
  if (!body?.name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Product name is required.' })
  }
  const item = await directusUser(event, '/items/products', {
    method: 'POST',
    body: {
      sku: body.sku ?? null,
      name: body.name.trim(),
      description: body.description ?? null,
      unit_price: body.unit_price ?? null,
      category: body.category ?? null,
      inventory_id: body.inventory_id ?? null,
    },
  })
  return { item }
})
