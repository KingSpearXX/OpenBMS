import { directusUser } from '../../../utils/directus-user'

const FIELDS = ['entry_date', 'branch', 'direction', 'amount', 'description', 'category', 'reference'] as const

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }

  if ('amount' in patch) {
    const amount = Number(patch.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw createError({ statusCode: 422, statusMessage: 'amount must be greater than zero.' })
    patch.amount = amount
  }
  if ('direction' in patch && !['in', 'out'].includes(patch.direction as string)) {
    throw createError({ statusCode: 422, statusMessage: 'direction must be "in" or "out".' })
  }
  if (typeof patch.description === 'string') patch.description = patch.description.trim()
  if (typeof patch.category === 'string') patch.category = patch.category.trim() || null
  if (typeof patch.reference === 'string') patch.reference = patch.reference.trim() || null

  const item = await directusUser(event, `/items/shop_ledger/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
