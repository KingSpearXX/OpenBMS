import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ObmsClient } from '../client.js'
import { jsonResult, withErrorHandling } from '../tool-helpers.js'

interface PosSale {
  id: string
  sold_at: string | null
  product_name: string
  unit_price: number | null
  quantity: number
  amount: number
  payment_method: string | null
  sales_branch: string | { id: string, shop_name: string } | null
  product?: number | null
}

const posSaleWritableFields = {
  product_name: z.string().min(1).describe('Line description/product name (snapshotted even if picked from a catalog product)'),
  unit_price: z.number().optional(),
  quantity: z.number().positive().optional(),
  payment_method: z.enum(['cash', 'bank_transfer']).optional(),
  sales_branch: z.string().optional().describe('Branch id (uuid) this sale was made at'),
  sold_at: z.string().optional().describe('Wall-clock sale datetime (ISO string), editable for back-encoded paper sales'),
  product: z.number().optional().describe('Optional product catalog id this sale was picked from — links stock auto-deduction'),
}

export function registerPosTools(server: McpServer, client: ObmsClient): void {
  server.registerTool(
    'list_pos_sales',
    {
      title: 'List POS sales',
      description: 'List point-of-sale sales (shop_sales), optionally filtered by date range, branch, or payment method.',
      inputSchema: {
        from: z.string().optional().describe('Sold-at range start (date string)'),
        to: z.string().optional().describe('Sold-at range end (date string)'),
        branch: z.string().optional().describe('Branch id (uuid) to filter by'),
        method: z.enum(['cash', 'bank_transfer']).optional().describe('Payment method to filter by'),
      },
    },
    withErrorHandling(async (query: { from?: string, to?: string, branch?: string, method?: string }) => {
      const { items } = await client.request<{ items: PosSale[] }>('GET', '/api/pos/sales', { query })
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'create_pos_sale',
    {
      title: 'Create POS sale',
      description: 'Record a point-of-sale sale into shop_sales. sales_total is computed server-side from unit_price * quantity — do not send it. If product is set and linked to a stock item, the sold quantity is auto-deducted from stock (best-effort, negative allowed).',
      inputSchema: posSaleWritableFields,
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { item } = await client.request<{ item: PosSale }>('POST', '/api/pos/sales', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_pos_sale',
    {
      title: 'Update POS sale',
      description: 'Partially update a POS sale. Only send the fields you want to change. sales_total is recomputed server-side from the merged price/quantity. If product or quantity changes, stock is reconciled server-side (old consumption restored, new applied).',
      inputSchema: { id: z.string().describe('Sale id (uuid)'), ...posSaleWritableFields, product_name: posSaleWritableFields.product_name.optional() },
    },
    withErrorHandling(async ({ id, ...patch }: { id: string } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: PosSale }>('PATCH', `/api/pos/sales/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_pos_sale',
    {
      title: 'Delete POS sale',
      description: 'Permanently delete a POS sale from the live OpenBMS backend. Irreversible — confirm with the user before calling. Any stock it had deducted is restored server-side.',
      inputSchema: { id: z.string().describe('Sale id (uuid)') },
    },
    withErrorHandling(async ({ id }: { id: string }) => {
      await client.request('DELETE', `/api/pos/sales/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )
}
