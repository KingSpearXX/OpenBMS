import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ObmsClient } from '../client.js'
import { jsonResult, withErrorHandling } from '../tool-helpers.js'

interface Customer {
  id: number
  partner_name: string
  credit: number | null
  date_created: string
}

interface Contact {
  id: number
  contact_name: string
  contact_address: string | null
  contact_number: string | null
  contact_email: string | null
  partner_id: number
}

export function registerCustomerTools(server: McpServer, client: ObmsClient): void {
  server.registerTool(
    'list_customers',
    {
      title: 'List customers',
      description: 'List all OpenBMS customers (id, name, credit, date created).',
      inputSchema: {},
    },
    withErrorHandling(async () => {
      const { items } = await client.request<{ items: Customer[] }>('GET', '/api/customers')
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'get_customer',
    {
      title: 'Get customer',
      description: 'Get a single customer by id, including its expanded primary contact.',
      inputSchema: { id: z.number().describe('Customer id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      const { item } = await client.request<{ item: Customer }>('GET', `/api/customers/${id}`)
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'create_customer',
    {
      title: 'Create customer',
      description: 'Create a new customer.',
      inputSchema: {
        partner_name: z.string().min(1).describe('Customer/company name'),
        credit: z.number().optional().describe('Optional starting credit balance'),
      },
    },
    withErrorHandling(async (args: { partner_name: string, credit?: number }) => {
      const { item } = await client.request<{ item: Customer }>('POST', '/api/customers', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_customer',
    {
      title: 'Update customer',
      description: 'Partially update a customer. Only send the fields you want to change.',
      inputSchema: {
        id: z.number().describe('Customer id'),
        partner_name: z.string().min(1).optional(),
        credit: z.number().optional(),
      },
    },
    withErrorHandling(async ({ id, ...patch }: { id: number, partner_name?: string, credit?: number }) => {
      const { item } = await client.request<{ item: Customer }>('PATCH', `/api/customers/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_customer',
    {
      title: 'Delete customer',
      description: 'Permanently delete a customer from the live OpenBMS backend. Irreversible — confirm with the user before calling.',
      inputSchema: { id: z.number().describe('Customer id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      await client.request('DELETE', `/api/customers/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )

  server.registerTool(
    'list_contacts',
    {
      title: 'List contacts',
      description: 'List contacts, optionally filtered to a single customer.',
      inputSchema: { customer: z.number().optional().describe('Customer id to filter by') },
    },
    withErrorHandling(async ({ customer }: { customer?: number }) => {
      const { items } = await client.request<{ items: Contact[] }>('GET', '/api/contacts', { query: { customer } })
      return jsonResult(items)
    }),
  )

  server.registerTool(
    'create_contact',
    {
      title: 'Create contact',
      description: 'Create a contact under a customer.',
      inputSchema: {
        partner_id: z.number().describe('Owning customer id'),
        contact_name: z.string().min(1),
        contact_address: z.string().optional(),
        contact_number: z.string().optional(),
        contact_email: z.string().optional(),
      },
    },
    withErrorHandling(async (args: { partner_id: number, contact_name: string, contact_address?: string, contact_number?: string, contact_email?: string }) => {
      const { item } = await client.request<{ item: Contact }>('POST', '/api/contacts', { body: args })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'update_contact',
    {
      title: 'Update contact',
      description: 'Partially update a contact. Only send the fields you want to change.',
      inputSchema: {
        id: z.number().describe('Contact id'),
        contact_name: z.string().min(1).optional(),
        contact_address: z.string().optional(),
        contact_number: z.string().optional(),
        contact_email: z.string().optional(),
      },
    },
    withErrorHandling(async ({ id, ...patch }: { id: number, contact_name?: string, contact_address?: string, contact_number?: string, contact_email?: string }) => {
      const { item } = await client.request<{ item: Contact }>('PATCH', `/api/contacts/${id}`, { body: patch })
      return jsonResult(item)
    }),
  )

  server.registerTool(
    'delete_contact',
    {
      title: 'Delete contact',
      description: 'Permanently delete a contact from the live OpenBMS backend. Irreversible — confirm with the user before calling.',
      inputSchema: { id: z.number().describe('Contact id') },
    },
    withErrorHandling(async ({ id }: { id: number }) => {
      await client.request('DELETE', `/api/contacts/${id}`)
      return jsonResult({ ok: true, id })
    }),
  )
}
