import { directusUser } from '../../utils/directus-user'

interface CustomerBody {
  partner_name?: string | null
  credit?: number | string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CustomerBody>(event)
  if (!body?.partner_name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Customer name is required.' })
  }
  const item = await directusUser(event, '/items/customers', {
    method: 'POST',
    body: {
      partner_name: body.partner_name.trim(),
      credit: body.credit ?? null,
    },
  })
  return { item }
})
