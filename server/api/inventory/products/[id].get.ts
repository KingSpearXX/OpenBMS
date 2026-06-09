import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = await directusUser(event, `/items/products/${id}`, {
    query: {
      fields: 'id,sku,name,description,unit_price,category.id,category.category_name,inventory_id.id,inventory_id.item_name,inventory_id.item_stock_value,inventory_id.unit',
    },
  })
  return { item }
})
