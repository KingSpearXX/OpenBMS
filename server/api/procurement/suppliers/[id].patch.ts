import { directusUser } from '../../../utils/directus-user'

interface SupplierBody {
  name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  status?: string | null
}

const FIELDS: (keyof SupplierBody)[] = ['name', 'email', 'phone', 'address', 'notes', 'status']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<SupplierBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) {
      patch[key] = typeof body[key] === 'string' ? (body[key] as string).trim() || null : body[key]
    }
  }
  if ('name' in patch && !patch.name) {
    throw createError({ statusCode: 422, statusMessage: 'Supplier name is required.' })
  }

  const item = await directusUser(event, `/items/suppliers/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
