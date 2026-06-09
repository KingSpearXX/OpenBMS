import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const item = await directusUser(event, `/items/customers/${id}`, {
    query: {
      fields: [
        'id',
        'partner_name',
        'credit',
        'date_created',
        'contact_entity.id',
        'contact_entity.contact_name',
        'contact_entity.contact_number',
        'contact_entity.contact_email',
        'contact_entity.contact_address',
      ].join(','),
    },
  })
  return { item }
})
