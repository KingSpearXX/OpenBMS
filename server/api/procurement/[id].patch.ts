import { directusUser } from '../../utils/directus-user'

interface OrderBody {
  supplier?: number | null
  order_date?: string | null
  status?: string | null
  notes?: string | null
}

const ALLOWED_STATUSES = ['draft', 'sent', 'received', 'cancelled']
const FIELDS: (keyof OrderBody)[] = ['supplier', 'order_date', 'status', 'notes']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<OrderBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if ('status' in patch && !ALLOWED_STATUSES.includes(patch.status as string)) {
    throw createError({ statusCode: 422, statusMessage: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` })
  }
  if ('notes' in patch && typeof patch.notes === 'string') {
    patch.notes = patch.notes.trim() || null
  }

  const item = await directusUser(event, `/items/procurement_orders/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
