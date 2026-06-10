import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = await directusUser(event, `/items/suppliers/${id}`, {
    query: { fields: 'id,name,email,phone,address,notes,status,date_created' },
  })
  return { item }
})
