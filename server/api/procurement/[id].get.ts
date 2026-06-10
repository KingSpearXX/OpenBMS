import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = await directusUser(event, `/items/procurement_orders/${id}`, {
    query: {
      fields: [
        'id',
        'reference_number',
        'order_date',
        'status',
        'notes',
        'date_created',
        'date_updated',
        'supplier.id',
        'supplier.name',
        'supplier.email',
        'supplier.phone',
        'supplier.address',
        'lines.id',
        'lines.item_name',
        'lines.sku',
        'lines.quantity',
        'lines.unit',
        'lines.unit_cost',
        'lines.notes',
        'lines.product',
        'lines.inventory_item',
      ].join(','),
    },
  })
  return { item }
})
