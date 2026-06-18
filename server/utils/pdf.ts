import type { H3Event } from 'h3'

// Whitelist of documents OpenBMS can generate. Maps the render-engine template slug to
// the single param key that template expects. The BFF rejects anything outside this set,
// so the proxy route can never be used as an open passthrough to the render API.
export const PDF_TEMPLATES = {
  'customer-statement': 'CustomerId',
  'order-invoice': 'OrderId',
  'order-delivery-receipt': 'OrderId',
  'quote': 'QuoteId',
} as const

export type PdfTemplate = keyof typeof PDF_TEMPLATES

export function isPdfTemplate(value: string): value is PdfTemplate {
  return Object.prototype.hasOwnProperty.call(PDF_TEMPLATES, value)
}

/**
 * Render a PDF via the external WeasyPrint API and return the raw bytes.
 *
 * Sends HTTP Basic Auth only when both credentials are configured, so the same code
 * path works whether or not the render API enforces auth. Upstream failures are mapped
 * to clean H3 errors so the caller (and the user's browser tab) sees a sane status
 * rather than a raw upstream body.
 */
export async function renderPdf(
  event: H3Event,
  template: PdfTemplate,
  params: Record<string, string>,
  filename: string,
): Promise<Buffer> {
  const { url, username, password } = useRuntimeConfig(event).pdfRender

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  }

  try {
    const res = await $fetch.raw(`${url}/render`, {
      method: 'POST',
      headers,
      body: { template, params, filename },
      responseType: 'arrayBuffer',
    })
    // Wrap in a Buffer: h3 only streams binary for Buffer/Uint8Array/Blob values; a bare
    // ArrayBuffer falls through to JSON.stringify (yielding "{}") and corrupts the PDF.
    return Buffer.from(res._data as ArrayBuffer)
  }
  catch (err) {
    const status = (err as { statusCode?: number, response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status

    // 503 = renderer busy/queue timeout; pass it through so the client can retry.
    if (status === 503) {
      throw createError({ statusCode: 503, statusMessage: 'PDF renderer is busy. Try again shortly.' })
    }
    // Everything else (502 WeasyPrint, 500 MSSQL, network unreachable, 4xx) becomes a 502:
    // from OpenBMS's perspective an upstream dependency failed to produce the document.
    throw createError({ statusCode: 502, statusMessage: 'Could not generate the PDF document.' })
  }
}
