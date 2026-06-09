import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await directusUser(event, `/items/media_inventory/${id}`, { method: 'DELETE' })
  return { ok: true }
})
