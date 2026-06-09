import { getDirectusUrl } from '../../utils/directus'
import { requireAccessToken } from '../../utils/directus-user'

// Receipt upload: forward the multipart file to Directus /files as the signed-in user,
// return the new file id (stored on the expense's expense_attachment).
export default defineEventHandler(async (event) => {
  const token = await requireAccessToken(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file) {
    throw createError({ statusCode: 422, statusMessage: 'No file provided.' })
  }

  const fd = new FormData()
  fd.append('file', new Blob([new Uint8Array(file.data)], { type: file.type || 'application/octet-stream' }), file.filename)

  const res = await $fetch<{ data: { id: string } }>(`${getDirectusUrl(event)}/files`, {
    method: 'POST',
    body: fd,
    headers: { Authorization: `Bearer ${token}` },
  })
  return { id: res.data.id }
})
