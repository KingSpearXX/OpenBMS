import type { H3Event } from 'h3'
import { directusUser } from './directus-user'

export async function generatePoNumber(event: H3Event): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`

  const rows = await directusUser<{ reference_number: string }[]>(
    event,
    '/items/procurement_orders',
    {
      query: {
        filter: JSON.stringify({ reference_number: { _starts_with: prefix } }),
        fields: 'reference_number',
        sort: '-reference_number',
        limit: 1,
      },
    },
  )

  let next = 1
  if (rows?.length) {
    const first = rows[0]
    if (first) {
      const seq = parseInt(first.reference_number.slice(prefix.length), 10)
      if (Number.isFinite(seq)) next = seq + 1
    }
  }

  return `${prefix}${String(next).padStart(3, '0')}`
}
