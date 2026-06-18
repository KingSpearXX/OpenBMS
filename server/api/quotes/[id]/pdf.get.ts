import { requireAccessToken } from '../../../utils/directus-user'
import { renderPdf } from '../../../utils/pdf'

export default defineEventHandler(async (event) => {
  await requireAccessToken(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Quote id is required.' })
  }

  const filename = `quote-${id}`
  const pdf = await renderPdf(event, 'quote', { QuoteId: id }, filename)

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `inline; filename="${filename}.pdf"`)
  setHeader(event, 'cache-control', 'private, no-store')
  return pdf
})
