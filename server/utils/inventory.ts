import type { H3Event } from 'h3'
import { directusUser } from './directus-user'

// Stock movement lives here (moved out of the Directus "Adjust from Media" flow):
// OpenBMS is the sole writer of media_inventory.item_stock_value going forward.
// Directus REST has no cross-collection transaction, so writes are ordered and
// compensated on failure. numeric(12,3) → round to 3 dp to avoid float dust.

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

async function readStock(event: H3Event, itemId: number): Promise<number> {
  const item = await directusUser<{ item_stock_value: number | string | null }>(
    event,
    `/items/media_inventory/${itemId}`,
    { query: { fields: 'item_stock_value' } },
  )
  return item?.item_stock_value == null ? 0 : Number(item.item_stock_value)
}

async function setStock(event: H3Event, itemId: number, value: number): Promise<void> {
  await directusUser(event, `/items/media_inventory/${itemId}`, {
    method: 'PATCH',
    body: { item_stock_value: round3(value) },
  })
}

function guardNegative(next: number, stock: number, used: number, allowNegative?: boolean) {
  if (next < 0 && !allowNegative) {
    throw createError({
      statusCode: 422,
      statusMessage: `Not enough stock: ${stock} on hand, ${used} requested.`,
    })
  }
}

interface UsageRow {
  id: number
  item_usage_value: number | string | null
  media_item_name: number | null
}

// Log a consumption event and deduct from stock. Compensates (removes the log) if the
// stock update fails, so we never leave a usage row without its deduction.
export async function logUsage(
  event: H3Event,
  input: { item: number, used: number, allowNegative?: boolean },
): Promise<UsageRow> {
  const stock = await readStock(event, input.item)
  const next = round3(stock - input.used)
  guardNegative(next, stock, input.used, input.allowNegative)

  const log = await directusUser<UsageRow>(event, '/items/media_usage_log', {
    method: 'POST',
    body: { media_item_name: input.item, item_usage_value: input.used },
  })

  try {
    await setStock(event, input.item, next)
  }
  catch (e) {
    await directusUser(event, `/items/media_usage_log/${log.id}`, { method: 'DELETE' }).catch(() => {})
    throw e
  }
  return log
}

// Edit a usage event: restore the old amount, apply the new one.
export async function editUsage(
  event: H3Event,
  logId: number,
  newUsed: number,
  allowNegative?: boolean,
): Promise<void> {
  const existing = await directusUser<UsageRow>(event, `/items/media_usage_log/${logId}`, {
    query: { fields: 'id,item_usage_value,media_item_name' },
  })
  const itemId = existing.media_item_name
  if (itemId == null) {
    throw createError({ statusCode: 422, statusMessage: 'Usage row has no linked stock item.' })
  }
  const oldUsed = Number(existing.item_usage_value ?? 0)
  const stock = await readStock(event, itemId)
  const next = round3(stock + oldUsed - newUsed)
  guardNegative(next, stock, newUsed, allowNegative)

  await directusUser(event, `/items/media_usage_log/${logId}`, {
    method: 'PATCH',
    body: { item_usage_value: newUsed },
  })
  await setStock(event, itemId, next)
}

// Delete a usage event and restore the stock it consumed (fixes the old flow's gap).
export async function deleteUsage(event: H3Event, logId: number): Promise<void> {
  const existing = await directusUser<UsageRow>(event, `/items/media_usage_log/${logId}`, {
    query: { fields: 'id,item_usage_value,media_item_name' },
  })
  const itemId = existing.media_item_name
  const used = Number(existing.item_usage_value ?? 0)

  await directusUser(event, `/items/media_usage_log/${logId}`, { method: 'DELETE' })

  if (itemId != null) {
    const stock = await readStock(event, itemId)
    await setStock(event, itemId, round3(stock + used))
  }
}
