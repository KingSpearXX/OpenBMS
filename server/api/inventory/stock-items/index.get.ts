import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const items = await directusUser(event, '/items/media_inventory', {
    query: {
      fields: 'id,item_name,item_stock_value,unit,reorder_level,item_category.id,item_category.category_name,location.id,location.shop_name,date_updated',
      sort: 'item_name',
      limit: 200,
    },
  })
  return { items }
})
