import { directusUser } from '../../utils/directus-user'

interface ExpenseBody {
  expense_amount?: number | string | null
  expense_category?: string | null
  expense_description?: string | null
  expense_attachment?: string | null
  branch?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ExpenseBody>(event)
  const amount = Number(body?.expense_amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Amount must be greater than zero.' })
  }
  const item = await directusUser(event, '/items/shop_expenses', {
    method: 'POST',
    body: {
      expense_amount: amount,
      expense_category: body.expense_category?.trim() || null,
      expense_description: body.expense_description ?? null,
      expense_attachment: body.expense_attachment ?? null,
      branch: body.branch ?? null,
    },
  })
  return { item }
})
