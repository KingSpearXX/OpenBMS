import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ObmsClient } from '../client.js'
import { jsonResult, withErrorHandling } from '../tool-helpers.js'

interface Product {
  id: number
  name: string
  sku: string | null
  description: string | null
  unit_price: number | null
  category: number | null
  inventory_id: number | null
}

interface StockItem {
  id: number
  item_name: string
  item_stock_value: number | null
  unit: string | null
  reorder_level: number | null
  item_category: number | null
  location: number | null
}

interface UsageLog {
  id: number
  item: number
  used: number
}

interface ItemCategory {
  id: number
  category_name: string
  category_description: string | null
}

interface ShopBranch {
  id: number
  shop_name: string
}

export function registerInventoryTools(server: McpServer, client: ObmsClient): void {
  // --- Products ---

  server.registerTool(
    'list_products',
    {
      title: 'List products',
      description: 'List the product catalog, including expanded category and linked stock item.',
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const { items } = await client.request<{ items: Product[] }>('GET', '/api/inventory/products')
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'get_product',
    {
      title: 'Get product',
      description: 'Get a single product by id, including its linked stock item\'s current quantity and unit.',
      inputSchema: { id: z.number().describe('Product id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      const { item } = await client.request<{ item: Product }>('GET', `/api/inventory/products/${id}`)
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'create_product',
    {
      title: 'Create product',
      description: 'Create a new product in the catalog.',
      inputSchema: {
        name: z.string().min(1),
        sku: z.string().optional(),
        description: z.string().optional(),
        unit_price: z.number().optional(),
        category: z.number().optional().describe('Item category id'),
        inventory_id: z.number().optional().describe('Stock item id this product is fulfilled from'),
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { item } = await client.request<{ item: Product }>('POST', '/api/inventory/products', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_product',
    {
      title: 'Update product',
      description: 'Partially update a product. Only send the fields you want to change.',
      inputSchema: {
        id: z.number().describe('Product id'),
        name: z.string().min(1).optional(),
        sku: z.string().optional(),
        description: z.string().optional(),
        unit_price: z.number().optional(),
        category: z.number().optional(),
        inventory_id: z.number().optional(),
      },
    },
    withErrorHandling(async ({ id, ...patch }: { id: number } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: Product }>('PATCH', `/api/inventory/products/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_product',
    {
      title: 'Delete product',
      description: 'Permanently delete a product from the catalog. Irreversible — confirm with the user before calling.',
      inputSchema: { id: z.number().describe('Product id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      await client.request('DELETE', `/api/inventory/products/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )

  // --- Stock items ---

  server.registerTool(
    'list_stock_items',
    {
      title: 'List stock items',
      description: 'List raw inventory stock items, including expanded category and location.',
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const { items } = await client.request<{ items: StockItem[] }>('GET', '/api/inventory/stock-items')
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'get_stock_item',
    {
      title: 'Get stock item',
      description: 'Get a single stock item by id.',
      inputSchema: { id: z.number().describe('Stock item id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      const { item } = await client.request<{ item: StockItem }>('GET', `/api/inventory/stock-items/${id}`)
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'create_stock_item',
    {
      title: 'Create stock item',
      description: 'Create a new raw inventory stock item.',
      inputSchema: {
        item_name: z.string().min(1),
        item_stock_value: z.number().optional().describe('Starting stock quantity'),
        unit: z.string().optional(),
        reorder_level: z.number().optional(),
        item_category: z.number().optional(),
        location: z.number().optional().describe('Branch id where this stock is held'),
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { item } = await client.request<{ item: StockItem }>('POST', '/api/inventory/stock-items', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_stock_item',
    {
      title: 'Update stock item',
      description: 'Partially update a stock item. Only send the fields you want to change. To adjust the stock quantity from a usage event, prefer log_inventory_usage instead of setting item_stock_value directly.',
      inputSchema: {
        id: z.number().describe('Stock item id'),
        item_name: z.string().min(1).optional(),
        item_stock_value: z.number().optional(),
        unit: z.string().optional(),
        reorder_level: z.number().optional(),
        item_category: z.number().optional(),
        location: z.number().optional(),
      },
    },
    withErrorHandling(async ({ id, ...patch }: { id: number } & Record<string, unknown>) => {
      const { item } = await client.request<{ item: StockItem }>('PATCH', `/api/inventory/stock-items/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_stock_item',
    {
      title: 'Delete stock item',
      description: 'Permanently delete a stock item. Irreversible — confirm with the user before calling.',
      inputSchema: { id: z.number().describe('Stock item id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      await client.request('DELETE', `/api/inventory/stock-items/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )

  // --- Usage log ---

  server.registerTool(
    'list_inventory_usage',
    {
      title: 'List inventory usage log',
      description: 'List stock usage log entries, optionally filtered to one stock item.',
      inputSchema: { item: z.number().optional().describe('Stock item id to filter by') },
    },
    withErrorHandling(async ({ item }: { item?: number }) => {
      const { items } = await client.request<{ items: UsageLog[] }>('GET', '/api/inventory/usage', { query: { item } })
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'log_inventory_usage',
    {
      title: 'Log inventory usage',
      description: 'Record stock consumed from a stock item, deducting it from item_stock_value. Fails if it would take stock negative unless allowNegative is set.',
      inputSchema: {
        item: z.number().describe('Stock item id'),
        used: z.number().positive().describe('Quantity consumed'),
        allowNegative: z.boolean().optional().describe('Allow the resulting stock value to go negative'),
      },
    },
    withErrorHandling(async (args: { item: number, used: number, allowNegative?: boolean }) => {
      const { item } = await client.request<{ item: UsageLog }>('POST', '/api/inventory/usage', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_inventory_usage',
    {
      title: 'Update inventory usage entry',
      description: 'Change the quantity on an existing usage log entry. The stock item\'s value is reconciled: the old quantity is restored, then the new quantity is deducted.',
      inputSchema: {
        id: z.number().describe('Usage log entry id'),
        used: z.number().positive().describe('New quantity consumed'),
        allowNegative: z.boolean().optional(),
      },
    },
    withErrorHandling(async ({ id, ...body }: { id: number, used: number, allowNegative?: boolean }) => {
      await client.request('PATCH', `/api/inventory/usage/${id}`, { body })
      return jsonResult({ ok: true, id })
    }),
  )

  server.registerTool(
    'delete_inventory_usage',
    {
      title: 'Delete inventory usage entry',
      description: 'Delete a usage log entry and restore the stock it had consumed. Irreversible as a log entry — confirm with the user before calling.',
      inputSchema: { id: z.number().describe('Usage log entry id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      await client.request('DELETE', `/api/inventory/usage/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )

  // --- Reference data ---

  server.registerTool(
    'list_item_categories',
    {
      title: 'List item categories',
      description: 'List inventory/product categories.',
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const { items } = await client.request<{ items: ItemCategory[] }>('GET', '/api/inventory/categories')
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'list_shop_branches',
    {
      title: 'List shop branches',
      description: 'List shop/branch locations.',
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const { items } = await client.request<{ items: ShopBranch[] }>('GET', '/api/inventory/branches')
      return jsonResult(items)
    }),
  )
}
