import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ObmsClient } from '../client.js'
import { jsonResult, withErrorHandling } from '../tool-helpers.js'

interface Quote {
  id: string
  status: string
  quote_date: string | null
  expiration_date: string | null
  subtotal: number | null
  discount_percent: number | null
  discount_amount: number | null
  tax_percent: number | null
  tax_amount: number | null
  total: number | null
  notes: string | null
  terms_conditions?: string | null
  internal_notes?: string | null
  customer: number | { id: number, partner_name: string }
  quote_lines?: QuoteLine[]
}

interface QuoteLine {
  id: string
  line_type: 'product' | 'free_text'
  product: number | null
  description: string | null
  quantity: number
  unit_price: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  amount: number
  sort?: number | null
}

const TOTALS_WARNING = 'Quote totals are NOT recalculated server-side (unlike Orders). After this call, compute and PATCH the parent quote\'s subtotal/tax_amount/total yourself via update_quote.'

const quoteWritableFields = {
  customer: z.number().optional().describe('Customer id this quote belongs to'),
  quote_date: z.string().optional(),
  expiration_date: z.string().optional(),
  notes: z.string().optional(),
  terms_conditions: z.string().optional(),
  internal_notes: z.string().optional(),
}

const quoteLineWritableFields = {
  line_type: z.enum(['product', 'free_text']).describe('Whether this line is picked from the product catalog or free-typed'),
  product: z.number().optional().describe('Product catalog id (when line_type is "product")'),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  discount_percent: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_percent: z.number().optional(),
  amount: z.number().optional().describe('Line total — computed by the caller, not the server'),
}

export function registerQuoteTools(server: McpServer, client: ObmsClient): void {
  server.registerTool(
    'list_quotes',
    {
      title: 'List quotes',
      description: 'List quotes, optionally filtered by status, customer, or date range.',
      inputSchema: {
        status: z.enum(['draft', 'sent', 'accepted', 'expired']).optional(),
        customer: z.number().optional().describe('Customer id to filter by'),
        from: z.string().optional().describe('quote_date range start'),
        to: z.string().optional().describe('expiration_date range end'),
      },
    },
    withErrorHandling(async (query: { status?: string, customer?: number, from?: string, to?: string }) => {
      const { items } = await client.request<{ items: Quote[] }>('GET', '/api/quotes', { query })
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'get_quote',
    {
      title: 'Get quote',
      description: 'Get a single quote by id, including expanded customer info and its quote_lines.',
      inputSchema: { id: z.string().describe('Quote id (uuid)') },
    },
    withErrorHandling(async ({ id }: { id: string }) => {
      const item = await client.request<Quote>('GET', `/api/quotes/${id}`)
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'create_quote',
    {
      title: 'Create quote',
      description: 'Create a new quote for a customer. Status always starts as "draft" — set it later via update_quote. Has no lines yet; add them with add_quote_line.',
      inputSchema: { ...quoteWritableFields, customer: z.number().describe('Customer id this quote belongs to') },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { item } = await client.request<{ item: Quote }>('POST', '/api/quotes', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_quote',
    {
      title: 'Update quote',
      description: 'Partially update a quote. Only send the fields you want to change. Unlike Orders, totals are not recalculated server-side: after adding/editing/deleting lines, compute and send subtotal/discount_amount/tax_amount/total yourself.',
      inputSchema: {
        id: z.string().describe('Quote id (uuid)'),
        ...quoteWritableFields,
        status: z.enum(['draft', 'sent', 'accepted', 'expired']).optional(),
        subtotal: z.number().optional(),
        discount_percent: z.number().optional(),
        discount_amount: z.number().optional(),
        tax_percent: z.number().optional(),
        tax_amount: z.number().optional(),
        total: z.number().optional(),
      },
    },
    withErrorHandling(async ({ id, ...patch }: { id: string } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: Quote }>('PATCH', `/api/quotes/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_quote',
    {
      title: 'Delete quote',
      description: 'Permanently delete a quote and its lines from the live OpenBMS backend. Irreversible — confirm with the user before calling.',
      inputSchema: { id: z.string().describe('Quote id (uuid)') },
    },
    withErrorHandling(async ({ id }: { id: string }) => {
      await client.request('DELETE', `/api/quotes/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )

  server.registerTool(
    'add_quote_line',
    {
      title: 'Add quote line',
      description: `Add a line item to a quote. amount is not computed server-side — set it yourself. ${TOTALS_WARNING}`,
      inputSchema: { quoteId: z.string().describe('Quote id (uuid)'), ...quoteLineWritableFields },
    },
    withErrorHandling(async ({ quoteId, ...body }: { quoteId: string } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: QuoteLine }>('POST', `/api/quotes/${quoteId}/lines`, { body })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_quote_line',
    {
      title: 'Update quote line',
      description: `Partially update a quote line. Only send the fields you want to change. ${TOTALS_WARNING}`,
      inputSchema: {
        quoteId: z.string().describe('Quote id (uuid) the line belongs to'),
        lineId: z.string().describe('Quote line id (uuid)'),
        ...quoteLineWritableFields,
        line_type: quoteLineWritableFields.line_type.optional(),
      },
    },
    withErrorHandling(async ({ quoteId, lineId, ...patch }: { quoteId: string, lineId: string } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: QuoteLine }>('PATCH', `/api/quotes/${quoteId}/lines/${lineId}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_quote_line',
    {
      title: 'Delete quote line',
      description: `Permanently delete a quote line. Irreversible — confirm with the user before calling. ${TOTALS_WARNING}`,
      inputSchema: { quoteId: z.string().describe('Quote id (uuid) the line belongs to'), lineId: z.string().describe('Quote line id (uuid)') },
    },
    withErrorHandling(async ({ quoteId, lineId }: { quoteId: string, lineId: string }) => {
      await client.request('DELETE', `/api/quotes/${quoteId}/lines/${lineId}`)
      return jsonResult({ ok: true, lineId })
    }),
  )
}
