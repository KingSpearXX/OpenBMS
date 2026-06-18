import type { Quote, QuoteWithLines, QuoteLine, QuoteInput, LineInput } from '~/types/quotes'

export function useQuotes() {
  return {
    listQuotes: (params?: { status?: string; customer?: number; from?: string; to?: string }) =>
      $fetch<{ items: Quote[] }>('/api/quotes', { query: params }),

    getQuote: (id: string) =>
      $fetch<QuoteWithLines>(`/api/quotes/${id}`),

    createQuote: (body: QuoteInput & { lines?: LineInput[] }) =>
      $fetch<Quote>('/api/quotes', { method: 'POST', body }),

    updateQuote: (id: string, body: Partial<QuoteInput> & { status?: string; lines?: LineInput[]; subtotal?: number | string | null; discount_percent?: number | string | null; discount_amount?: number | string | null; tax_percent?: number | string | null; tax_amount?: number | string | null; total?: number | string | null }) =>
      $fetch<Quote>(`/api/quotes/${id}`, { method: 'PATCH', body }),

    deleteQuote: (id: string) =>
      $fetch(`/api/quotes/${id}`, { method: 'DELETE' }),

    // PDF — opens PDF renderer in new tab
    downloadPdf: (quoteId: string) => {
      window.open(`/api/documents/quote/${quoteId}`, '_blank')
    },
  }
}
