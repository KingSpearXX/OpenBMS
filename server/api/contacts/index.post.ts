import { directusUser } from '../../utils/directus-user'

interface ContactBody {
  partner_id?: number | null
  contact_name?: string | null
  contact_address?: string | null
  contact_number?: string | null
  contact_email?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContactBody>(event)
  if (!body?.partner_id) {
    throw createError({ statusCode: 422, statusMessage: 'A customer is required.' })
  }
  if (!body.contact_name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Contact name is required.' })
  }
  const item = await directusUser(event, '/items/contacts', {
    method: 'POST',
    body: {
      partner_id: body.partner_id,
      contact_name: body.contact_name.trim(),
      contact_address: body.contact_address ?? null,
      contact_number: body.contact_number ?? null,
      contact_email: body.contact_email ?? null,
    },
  })
  return { item }
})
