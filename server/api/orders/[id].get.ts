import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = await directusUser(event, `/items/orders/${id}`, {
    query: {
      fields: [
        'id',
        'total',
        'tax',
        'discount',
        'downpayment',
        'shipping_address',
        'remarks',
        'paid',
        'shipped',
        'completed',
        'order_date',
        'order_updated',
        'sales_employee',
        'partner_id.id',
        'partner_id.partner_name',
      ].join(','),
    },
  })
  return { item }
})
