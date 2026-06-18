// Generate PDF documents via the authenticated BFF render proxy. Mirrors the
// `useProcurement.exportCsv` pattern: navigate to the endpoint in a new tab and let the
// browser handle loading/display. Same-origin navigation carries the session cookie, so
// auth just works, and calling window.open directly in the click handler avoids popup
// blockers. Valid slugs: customer-statement, order-invoice, order-delivery-receipt.
export function useDocuments() {
  return {
    openDocument: (slug: string, id: number | string) => {
      window.open(`/api/documents/${slug}/${id}`, '_blank')
    },
  }
}
