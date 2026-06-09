import { directusUser } from '../../utils/directus-user'

interface ExpenseBody {
  expense_amount?: number | string | null
  expense_category?: string | null
  expense_description?: string | null
  expense_attachment?: string | null
}

const FIELDS: (keyof ExpenseBody)[] = ['expense_amount', 'expense_category', 'expense_description', 'expense_attachment']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<ExpenseBody>(event)

  const patch: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (key in (body ?? {})) patch[key] = body[key]
  }
  if ('expense_amount' in patch) patch.expense_amount = Number(patch.expense_amount)
  if (typeof patch.expense_category === 'string') patch.expense_category = (patch.expense_category as string).trim() || null

  const item = await directusUser(event, `/items/shop_expenses/${id}`, { method: 'PATCH', body: patch })
  return { item }
})
