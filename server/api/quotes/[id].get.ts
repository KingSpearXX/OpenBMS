import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await directusUser(event, `/items/quotes/${id}`, {
    query: {
      fields: [
        'id',
        'status',
        'quote_date',
        'expiration_date',
        'subtotal',
        'discount_percent',
        'discount_amount',
        'tax_percent',
        'tax_amount',
        'total',
        'notes',
        'terms_conditions',
        'internal_notes',
        'date_created',
        'date_updated',
        'customer.id',
        'customer.partner_name',
        'customer.credit',
        'lines.id',
        'lines.line_type',
        'lines.description',
        'lines.quantity',
        'lines.unit_price',
        'lines.discount_percent',
        'lines.discount_amount',
        'lines.tax_percent',
        'lines.amount',
        'lines.product',
        'lines.sort',
      ].join(','),
      deep: JSON.stringify({ lines: { _sort: ['sort'] } }),
    },
  }) as { lines?: unknown[] } & Record<string, unknown>
  // Directus relation field is 'lines'; rename to 'quote_lines' to match QuoteWithLines type
  const { lines, ...rest } = raw
  return { ...rest, quote_lines: lines ?? [] }
})
