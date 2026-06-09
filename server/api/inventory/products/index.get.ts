import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const items = await directusUser(event, '/items/products', {
    query: {
      fields: 'id,sku,name,description,unit_price,category.id,category.category_name,inventory_id.id,inventory_id.item_name',
      sort: 'name',
      limit: 200,
    },
  })
  return { items }
})
