import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ObmsClient } from '../client.js'
import { jsonResult, withErrorHandling } from '../tool-helpers.js'

interface Order {
  id: number
  partner_id: number | { id: number, partner_name: string }
  sales_employee: number | null
  tax: number | null
  discount: number | null
  downpayment: number | null
  shipping_address: string | null
  remarks: string | null
  paid: boolean
  shipped: boolean
  completed: boolean
  total: number
}

interface OrderLine {
  id: number
  product_name: string
  quantity: number
  unit_price: number | null
  discount: number | null
  line_total: number
  product?: number | null
}

interface Employee {
  id: number
  name: string
}

const orderWritableFields = {
  partner_id: z.number().optional().describe('Customer id this order belongs to'),
  sales_employee: z.number().optional().describe('Employee id who made the sale'),
  tax: z.number().optional(),
  discount: z.number().optional().describe('Flat discount amount (not a percent)'),
  downpayment: z.number().optional(),
  shipping_address: z.string().optional(),
  remarks: z.string().optional(),
  paid: z.boolean().optional(),
  shipped: z.boolean().optional(),
  completed: z.boolean().optional(),
}

export function registerOrderTools(server: McpServer, client: ObmsClient): void {
  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description: 'List orders, optionally filtered to a single customer.',
      inputSchema: { customer: z.number().optional().describe('Customer id to filter by') },
    },
    withErrorHandling(async ({ customer }: { customer?: number }) => {
      const { items } = await client.request<{ items: Order[] }>('GET', '/api/orders', { query: { customer } })
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'get_order',
    {
      title: 'Get order',
      description: 'Get a single order by id, including expanded customer info.',
      inputSchema: { id: z.number().describe('Order id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      const { item } = await client.request<{ item: Order }>('GET', `/api/orders/${id}`)
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'create_order',
    {
      title: 'Create order',
      description: 'Create a new order for a customer. The order total is recalculated server-side from its lines, tax and discount — do not compute it yourself.',
      inputSchema: { ...orderWritableFields, partner_id: z.number().describe('Customer id this order belongs to') },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { item } = await client.request<{ item: Order }>('POST', '/api/orders', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_order',
    {
      title: 'Update order',
      description: 'Partially update an order. Only send the fields you want to change. Changing tax/discount triggers a server-side total recalculation.',
      inputSchema: { id: z.number().describe('Order id'), ...orderWritableFields },
    },
    withErrorHandling(async ({ id, ...patch }: { id: number } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: Order }>('PATCH', `/api/orders/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_order',
    {
      title: 'Delete order',
      description: 'Permanently delete an order and its lines from the live OpenBMS backend. Irreversible — confirm with the user before calling.',
      inputSchema: { id: z.number().describe('Order id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      await client.request('DELETE', `/api/orders/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )

  server.registerTool(
    'list_order_employees',
    {
      title: 'List sales employees',
      description: 'List employees that can be assigned as an order\'s sales_employee.',
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const { items } = await client.request<{ items: Employee[] }>('GET', '/api/orders/employees')
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'list_order_lines',
    {
      title: 'List order lines',
      description: 'List the line items on an order.',
      inputSchema: { orderId: z.number().describe('Order id') },
    },
    withErrorHandling(async ({ orderId }: { orderId: number }) => {
      const { items } = await client.request<{ items: OrderLine[] }>('GET', `/api/orders/${orderId}/lines`)
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'add_order_line',
    {
      title: 'Add order line',
      description: 'Add a line item to an order (picked from the product catalog via `product`, or free-typed via `product_name`). Triggers a server-side order total recalculation.',
      inputSchema: {
        orderId: z.number().describe('Order id'),
        product_name: z.string().min(1).describe('Line description/name (snapshotted even if picked from a catalog product)'),
        quantity: z.number().positive(),
        unit_price: z.number().optional(),
        discount: z.number().optional().describe('Flat discount amount for this line'),
        product: z.number().optional().describe('Optional product catalog id this line was picked from'),
      },
    },
    withErrorHandling(async ({ orderId, ...body }: { orderId: number } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: OrderLine }>('POST', `/api/orders/${orderId}/lines`, { body })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_order_line',
    {
      title: 'Update order line',
      description: 'Partially update an order line. Only send the fields you want to change. Triggers a server-side order total recalculation.',
      inputSchema: {
        lineId: z.number().describe('Order line id'),
        product_name: z.string().min(1).optional(),
        quantity: z.number().positive().optional(),
        unit_price: z.number().optional(),
        discount: z.number().optional(),
        product: z.number().optional(),
      },
    },
    withErrorHandling(async ({ lineId, ...patch }: { lineId: number } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: OrderLine }>('PATCH', `/api/order-lines/${lineId}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_order_line',
    {
      title: 'Delete order line',
      description: 'Permanently delete an order line. Irreversible — confirm with the user before calling. Triggers a server-side order total recalculation.',
      inputSchema: { lineId: z.number().describe('Order line id') },
    },
    withErrorHandling(async ({ lineId }: { lineId: number }) => {
      await client.request('DELETE', `/api/order-lines/${lineId}`)
      return jsonResult({ ok: true, lineId })
    }),
  )
}
