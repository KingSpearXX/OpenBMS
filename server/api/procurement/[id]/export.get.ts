import { directusUser } from '../../../utils/directus-user'
import type { ProcurementOrderWithLines } from '~/types/procurement'

function csvCell(val: unknown): string {
  const s = val == null ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',')
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const order = await directusUser<ProcurementOrderWithLines>(event, `/items/procurement_orders/${id}`, {
    query: {
      fields: [
        'id',
        'reference_number',
        'order_date',
        'status',
        'notes',
        'supplier.name',
        'supplier.email',
        'supplier.phone',
        'lines.item_name',
        'lines.sku',
        'lines.quantity',
        'lines.unit',
        'lines.unit_cost',
        'lines.notes',
      ].join(','),
    },
  })

  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })

  const supplier = order.supplier as { name?: string; email?: string; phone?: string } | null
  const lines = (order.lines ?? []) as Array<{
    item_name: string; sku: string | null; quantity: unknown
    unit: string | null; unit_cost: unknown; notes: string | null
  }>

  const rows: string[] = [
    `Purchase Order: ${order.reference_number ?? id}`,
    `Supplier: ${supplier?.name ?? ''}`,
    supplier?.email ? `Email: ${supplier.email}` : '',
    supplier?.phone ? `Phone: ${supplier.phone}` : '',
    `Date: ${order.order_date ?? ''}`,
    `Status: ${order.status ?? ''}`,
    order.notes ? `Notes: ${order.notes}` : '',
    '',
    csvRow(['SKU', 'Item Name', 'Quantity', 'Unit', 'Unit Cost', 'Notes']),
    ...lines.map(l => csvRow([l.sku ?? '', l.item_name, l.quantity, l.unit ?? '', l.unit_cost ?? '', l.notes ?? ''])),
  ].filter(r => r !== undefined) as string[]

  const csv = rows.join('\r\n')
  const filename = `${order.reference_number ?? `PO-${id}`}.csv`

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})
