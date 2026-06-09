import type { Expense } from '~/types/expenses'

export const EXPENSE_CATEGORIES = ['Supplies', 'Payment', 'Salary', 'Admin', 'Rent', 'Lalamove']

export interface ExpenseInput {
  expense_amount: number
  expense_category?: string | null
  expense_description?: string | null
  expense_attachment?: string | null
}

export function useExpenses() {
  return {
    createExpense: (body: ExpenseInput) =>
      $fetch<{ item: Expense }>('/api/expenses', { method: 'POST', body }),
    updateExpense: (id: number, body: Partial<ExpenseInput>) =>
      $fetch<{ item: Expense }>(`/api/expenses/${id}`, { method: 'PATCH', body }),
    deleteExpense: (id: number) =>
      $fetch(`/api/expenses/${id}`, { method: 'DELETE' }),

    // Upload a receipt file → returns the Directus file id to store on the expense.
    uploadReceipt: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return $fetch<{ id: string }>('/api/expenses/upload', { method: 'POST', body: fd }).then(r => r.id)
    },
  }
}
