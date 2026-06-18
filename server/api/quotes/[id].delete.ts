import { directusUser } from '../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await directusUser(event, `/items/quotes/${id}`, { method: 'DELETE' })
  return { ok: true }
})
