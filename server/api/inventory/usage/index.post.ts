import { logUsage } from '../../../utils/inventory'

interface UsageBody {
  item?: number | null
  used?: number | string | null
  allowNegative?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UsageBody>(event)
  const item = body?.item != null ? Number(body.item) : null
  const used = body?.used != null ? Number(body.used) : NaN

  if (!item) {
    throw createError({ statusCode: 422, statusMessage: 'A stock item is required.' })
  }
  if (!Number.isFinite(used) || used <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Used amount must be greater than zero.' })
  }

  const log = await logUsage(event, { item, used, allowNegative: body?.allowNegative })
  return { item: log }
})
