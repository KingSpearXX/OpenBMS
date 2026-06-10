import { directusUser } from '../../../utils/directus-user'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const amount = Number(body?.amount)

  if (!body?.branch) throw createError({ statusCode: 422, statusMessage: 'branch is required.' })
  if (!body?.entry_date) throw createError({ statusCode: 422, statusMessage: 'entry_date is required.' })
  if (!['in', 'out'].includes(body?.direction)) throw createError({ statusCode: 422, statusMessage: 'direction must be "in" or "out".' })
  if (!Number.isFinite(amount) || amount <= 0) throw createError({ statusCode: 422, statusMessage: 'amount must be greater than zero.' })
  if (!body?.description?.trim()) throw createError({ statusCode: 422, statusMessage: 'description is required.' })

  const item = await directusUser(event, '/items/shop_ledger', {
    method: 'POST',
    body: {
      entry_date: body.entry_date,
      branch: body.branch,
      direction: body.direction,
      amount,
      description: body.description.trim(),
      category: body.category?.trim() || null,
      reference: body.reference?.trim() || null,
    },
  })
  return { item }
})
