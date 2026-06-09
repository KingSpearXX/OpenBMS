import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const items = await directusUser(event, '/items/shop_branches', {
    query: {
      fields: 'id,shop_name',
      sort: 'shop_name',
      limit: -1,
    },
  })
  return { items }
})
