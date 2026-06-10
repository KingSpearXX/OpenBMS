import { directusUser } from '../../../utils/directus-user'

interface SupplierBody {
  name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  status?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SupplierBody>(event)
  if (!body?.name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Supplier name is required.' })
  }
  const item = await directusUser(event, '/items/suppliers', {
    method: 'POST',
    body: {
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      notes: body.notes?.trim() || null,
      status: body.status ?? 'active',
    },
  })
  return { item }
})
