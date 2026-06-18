import { directusUser } from '../../utils/directus-user'

interface QuoteBody {
  customer?: number | null
  quote_date?: string | null
  expiration_date?: string | null
  status?: string | null
  subtotal?: number | string | null
  discount_percent?: number | string | null
  discount_amount?: number | string | null
  tax_percent?: number | string | null
  tax_amount?: number | string | null
  total?: number | string | null
  notes?: string | null
  terms_conditions?: string | null
  internal_notes?: string | null
}

const ALLOWED_STATUSES = ['draft', 'sent', 'accepted', 'expired']
const FIELDS: (keyof QuoteBody)[] = [
  'customer', 'quote_date', 'expiration_date', 'status',
  'subtotal', 'discount_percent', 'discount_amount',
  'tax_percent', 'tax_amount', 'total',
  'notes', 'terms_conditions', 'internal_notes',
]

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<QuoteBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if ('status' in patch && !ALLOWED_STATUSES.includes(patch.status as string)) {
    throw createError({ statusCode: 422, statusMessage: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` })
  }
  for (const text of ['notes', 'terms_conditions', 'internal_notes'] as const) {
    if (text in patch && typeof patch[text] === 'string') {
      patch[text] = (patch[text] as string).trim() || null
    }
  }

  const item = await directusUser(event, `/items/quotes/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
