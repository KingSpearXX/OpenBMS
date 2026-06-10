// expense_amount is a float → returned as a string by Directus; coerced in the UI.
export interface Expense {
  id: number
  date_created: string | null
  expense_amount: number | string | null
  expense_category: string | null
  expense_description: string | null
  expense_attachment: string | null
  branch: string | null
}
