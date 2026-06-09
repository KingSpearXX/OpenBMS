import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = await directusUser(event, `/items/media_inventory/${id}`, {
    query: {
      fields: 'id,item_name,item_stock_value,unit,reorder_level,item_category.id,item_category.category_name,location.id,location.shop_name,date_created,date_updated',
    },
  })
  return { item }
})
