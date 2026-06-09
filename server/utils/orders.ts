import type { H3Event } from 'h3'
import { directusUser } from './directus-user'

// Order math + linkage. IMPORTANT: order lines link to orders through the
// `orders_order_lines` m2m junction (orders_id ↔ order_lines_id) — the direct
// `order_lines.order_id` FK is null in the live data, so the junction is canonical.
// Money fields come back from Directus as strings → coerce with Number(). 2dp rounding.

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeLineTotal(
  quantity: number | string | null | undefined,
  unitPrice: number | string | null | undefined,
  discount: number | string | null | undefined = 0,
): number {
  const qty = Number(quantity) || 0
  const price = Number(unitPrice) || 0
  const disc = Number(discount) || 0
  return round2(qty * price - disc)
}

// --- m2m junction helpers ---------------------------------------------------

interface JunctionRow {
  id: number
  orders_id: number | null
  order_lines_id: number | null
}

// Junction rows for an order (newest first).
export async function junctionByOrder(event: H3Event, orderId: number): Promise<JunctionRow[]> {
  const rows = await directusUser<JunctionRow[]>(event, '/items/orders_order_lines', {
    query: {
      filter: JSON.stringify({ orders_id: { _eq: orderId } }),
      fields: 'id,orders_id,order_lines_id',
      sort: 'id',
      limit: -1,
    },
  })
  return rows ?? []
}

// Junction rows referencing a given line (used to find its order + clean up on delete).
export async function junctionByLine(event: H3Event, lineId: number): Promise<JunctionRow[]> {
  const rows = await directusUser<JunctionRow[]>(event, '/items/orders_order_lines', {
    query: {
      filter: JSON.stringify({ order_lines_id: { _eq: lineId } }),
      fields: 'id,orders_id,order_lines_id',
      limit: -1,
    },
  })
  return rows ?? []
}

export async function linkLineToOrder(event: H3Event, orderId: number, lineId: number): Promise<void> {
  await directusUser(event, '/items/orders_order_lines', {
    method: 'POST',
    body: { orders_id: orderId, order_lines_id: lineId },
  })
}

// Recompute and persist an order's total from its line items (summed via the junction):
//   total = Σ line_total − numericDiscount + tax
// `orders.discount` is a free string — only subtracted when it parses as a number.
export async function recalcOrderTotal(event: H3Event, orderId: number): Promise<number> {
  const order = await directusUser<{ tax: number | string | null, discount: string | null }>(
    event,
    `/items/orders/${orderId}`,
    { query: { fields: 'tax,discount' } },
  )
  const rows = await directusUser<{ order_lines_id: { line_total: number | string | null } | null }[]>(
    event,
    '/items/orders_order_lines',
    {
      query: {
        filter: JSON.stringify({ orders_id: { _eq: orderId } }),
        fields: 'order_lines_id.line_total',
        limit: -1,
      },
    },
  )

  const linesSum = (rows ?? []).reduce((sum, r) => sum + (Number(r.order_lines_id?.line_total) || 0), 0)
  const tax = Number(order?.tax) || 0
  const parsedDiscount = Number(order?.discount)
  const discount = Number.isFinite(parsedDiscount) ? parsedDiscount : 0
  const total = round2(linesSum - discount + tax)

  await directusUser(event, `/items/orders/${orderId}`, { method: 'PATCH', body: { total } })
  return total
}

// --- optional product FK detection ------------------------------------------
// `order_lines.product` (m2o → products) is an additive, pilot-applied column. When it
// exists we read/write it; otherwise we silently fall back to product_name only. Cached
// per process (a backend schema change + dev restart refreshes it).

const fieldCache = new Map<string, Set<string>>()

async function collectionFields(event: H3Event, collection: string): Promise<Set<string>> {
  const cached = fieldCache.get(collection)
  if (cached) return cached
  try {
    const fields = await directusUser<{ field: string }[]>(event, `/fields/${collection}`, {
      query: { limit: -1 },
    })
    const set = new Set((fields ?? []).map(f => f.field))
    fieldCache.set(collection, set)
    return set
  }
  catch {
    return new Set<string>()
  }
}

export async function orderLinesHasProduct(event: H3Event): Promise<boolean> {
  return (await collectionFields(event, 'order_lines')).has('product')
}
