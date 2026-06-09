import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const items = await directusUser(event, '/items/item_category', {
    query: {
      fields: 'id,category_name,category_description',
      sort: 'category_name',
      limit: -1,
    },
  })
  return { items }
})
