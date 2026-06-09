import { getDirectusUrl } from '../../../utils/directus'
import { requireAccessToken } from '../../../utils/directus-user'

// Stream a receipt from Directus /assets as the signed-in user (files may be private),
// so a plain <a href> can view/download it.
export default defineEventHandler(async (event) => {
  const token = await requireAccessToken(event)
  const id = getRouterParam(event, 'id')

  const upstream = await $fetch.raw(`${getDirectusUrl(event)}/assets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arrayBuffer',
  })

  setHeader(event, 'content-type', upstream.headers.get('content-type') || 'application/octet-stream')
  setHeader(event, 'cache-control', 'private, max-age=60')
  return upstream._data
})
