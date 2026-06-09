import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const items = await directusUser(event, '/items/customers', {
    query: {
      fields: 'id,partner_name,credit,date_created',
      sort: 'partner_name',
      limit: -1,
    },
  })
  return { items }
})
