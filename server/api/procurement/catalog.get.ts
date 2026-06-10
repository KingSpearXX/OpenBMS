import { directusUser } from '../../utils/directus-user'
import type { CatalogItem } from '~/types/procurement'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const search = q.search ? String(q.search) : undefined

  const baseQuery = (extra: Record<string, unknown> = {}) => ({
    limit: 20,
    ...(search ? { search } : {}),
    ...extra,
  })

  const [products, stockItems] = await Promise.all([
    directusUser<{ id: number; name: string | null; sku: string | null; unit_price: string | null; inventory_id: { unit: string | null } | null }[]>(
      event,
      '/items/products',
      {
        query: {
          ...baseQuery({ fields: 'id,name,sku,unit_price,inventory_id.unit' }),
        },
      },
    ),
    directusUser<{ id: number; item_name: string; unit: string | null }[]>(
      event,
      '/items/media_inventory',
      {
        query: baseQuery({ fields: 'id,item_name,unit' }),
      },
    ),
  ])

  const items: CatalogItem[] = [
    ...(products ?? []).map(p => ({
      type: 'product' as const,
      id: p.id,
      name: p.name ?? '',
      sku: p.sku,
      unit: p.inventory_id?.unit ?? null,
      unit_cost: p.unit_price,
    })),
    ...(stockItems ?? []).map(s => ({
      type: 'inventory' as const,
      id: s.id,
      name: s.item_name,
      sku: null,
      unit: s.unit,
      unit_cost: null,
    })),
  ]

  return { items }
})
