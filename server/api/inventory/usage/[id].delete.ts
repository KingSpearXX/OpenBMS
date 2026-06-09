import { deleteUsage } from '../../../utils/inventory'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await deleteUsage(event, Number(id))
  return { ok: true }
})
