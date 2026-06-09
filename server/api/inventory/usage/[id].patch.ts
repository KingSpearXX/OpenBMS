import { editUsage } from '../../../utils/inventory'

interface UsageBody {
  used?: number | string | null
  allowNegative?: boolean
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<UsageBody>(event)
  const used = body?.used != null ? Number(body.used) : NaN

  if (!Number.isFinite(used) || used <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Used amount must be greater than zero.' })
  }

  await editUsage(event, Number(id), used, body?.allowNegative)
  return { ok: true }
})
