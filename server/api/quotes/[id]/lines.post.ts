import { directusUser } from '../../../utils/directus-user'

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
  const quoteId = getRouterParam(event, 'id')
  const body = await readBody<LineBody>(event)

  if (!body?.line_type) {
    throw createError({ statusCode: 422, statusMessage: 'Line type is required.' })
  }
  if (!['product', 'free_text'].includes(body.line_type)) {
    throw createError({ statusCode: 422, statusMessage: 'Line type must be "product" or "free_text".' })
  }

  const item = await directusUser(event, '/items/quote_lines', {
    method: 'POST',
    body: {
      quote: quoteId,
      line_type: body.line_type,
      product: body.product ?? null,
      description: body.description?.trim() || null,
      quantity: body.quantity != null ? Number(body.quantity) : 1,
      unit_price: body.unit_price != null ? Number(body.unit_price) : 0,
      discount_percent: body.discount_percent != null ? Number(body.discount_percent) : 0,
      discount_amount: body.discount_amount != null ? Number(body.discount_amount) : 0,
      tax_percent: body.tax_percent != null ? Number(body.tax_percent) : 0,
      amount: body.amount != null ? Number(body.amount) : 0,
    },
  })
  return { item }
})
