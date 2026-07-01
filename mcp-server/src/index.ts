#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ObmsClient } from './client.js'
import { registerCustomerTools } from './tools/customers.js'
import { registerOrderTools } from './tools/orders.js'
import { registerInventoryTools } from './tools/inventory.js'
import { registerPosTools } from './tools/pos.js'
import { registerQuoteTools } from './tools/quotes.js'

// Resolve .env relative to this package, not process.cwd() — MCP clients (Hermes,
// Claude Code, etc.) spawn this as a subprocess and don't reliably set cwd to here.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
// quiet: true is required, not cosmetic — dotenv's default log line prints to
// stdout, which would corrupt the MCP JSON-RPC stdio stream.
loadEnv({ path: join(packageRoot, '.env'), quiet: true })

const baseUrl = process.env.OBMS_BASE_URL ?? 'http://localhost:3000'
const email = process.env.OBMS_MCP_EMAIL
const password = process.env.OBMS_MCP_PASSWORD

if (!email || !password) {
  console.error('OBMS_MCP_EMAIL and OBMS_MCP_PASSWORD must be set (copy mcp-server/.env.example to .env).')
  process.exit(1)
}

const client = new ObmsClient({ baseUrl, email, password })

const server = new McpServer({
  name: 'openbms-mcp',
  version: '0.1.0',
})

registerCustomerTools(server, client)
registerOrderTools(server, client)
registerInventoryTools(server, client)
registerPosTools(server, client)
registerQuoteTools(server, client)

const transport = new StdioServerTransport()
await server.connect(transport)
