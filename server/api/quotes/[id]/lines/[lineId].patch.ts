import { directusUser } from '../../../../utils/directus-user'

interface LineBody {
  line_type?: string | null
  product?: number | null
  description?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  discount_percent?: number | string | null
  discount_amount?: number | string | null
  tax_percent?: number | string | null
  amount?: number | string | null
}

export default defineEventHandler(async (event) => {
  const lineId = getRouterParam(event, 'lineId')
  const body = await readBody<LineBody>(event)

  const patch: Record<string, unknown> = {}
  const fields: (keyof LineBody)[] = [
    'line_type', 'product', 'description', 'quantity',
    'unit_price', 'discount_percent', 'discount_amount',
    'tax_percent', 'amount',
  ]
  for (const key of fields) {
    if (key in (body ?? {})) {
      const v = body[key]
      if (key === 'quantity') {
        patch[key] = v != null ? Number(v) : 1
      } else if (['unit_price', 'discount_percent', 'discount_amount', 'tax_percent', 'amount'].includes(key)) {
        patch[key] = v != null ? Number(v) : 0
      } else {
        patch[key] = v
      }
    }
  }

  const item = await directusUser(event, `/items/quote_lines/${lineId}`, { method: 'PATCH', body: patch })
  return { item }
})
