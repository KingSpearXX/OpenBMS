import { directusUser } from '../../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const lineId = getRouterParam(event, 'lineId')
  await directusUser(event, `/items/procurement_lines/${lineId}`, { method: 'DELETE' })
  return { ok: true }
})
