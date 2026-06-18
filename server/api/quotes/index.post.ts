import { directusUser } from '../../utils/directus-user'

interface QuoteBody {
  customer?: number | null
  quote_date?: string | null
  expiration_date?: string | null
  notes?: string | null
  terms_conditions?: string | null
  internal_notes?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<QuoteBody>(event)
  if (!body?.customer) {
    throw createError({ statusCode: 422, statusMessage: 'A customer is required.' })
  }

  const item = await directusUser(event, '/items/quotes', {
    method: 'POST',
    body: {
      customer: body.customer,
      quote_date: body.quote_date ?? new Date().toISOString().slice(0, 10),
      expiration_date: body.expiration_date ?? null,
      status: 'draft',
      notes: body.notes?.trim() || null,
      terms_conditions: body.terms_conditions?.trim() || null,
      internal_notes: body.internal_notes?.trim() || null,
    },
  })
  return { item }
})
