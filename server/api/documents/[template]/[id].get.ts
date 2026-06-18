import { requireAccessToken } from '../../../utils/directus-user'
import { PDF_TEMPLATES, isPdfTemplate, renderPdf } from '../../../utils/pdf'

// Authenticated proxy to the external WeasyPrint render API. Accepts only the whitelisted
// document templates, passes the record id through as the template's expected param, and
// streams the resulting PDF back inline so it opens in a new browser tab.
export default defineEventHandler(async (event) => {
  // Gate on a valid session — only signed-in users can generate documents.
  await requireAccessToken(event)

  const template = getRouterParam(event, 'template') ?? ''
  if (!isPdfTemplate(template)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown document template.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'A numeric record id is required.' })
  }

  const paramKey = PDF_TEMPLATES[template]
  const filename = `${template}-${id}`
  const pdf = await renderPdf(event, template, { [paramKey]: id }, filename)

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `inline; filename="${filename}.pdf"`)
  setHeader(event, 'cache-control', 'private, no-store')
  return pdf
})
