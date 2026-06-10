import type { LedgerEntry, LedgerDirection } from '~/types/ledger'

export const LEDGER_IN_CATEGORIES = ['Sales Receipt', 'Bank Refund', 'Capital', 'Other']
export const LEDGER_OUT_CATEGORIES = ['Bank Deposit', 'Supplier Payment', 'Salary', 'Expense', 'Other']

export interface LedgerEntryInput {
  entry_date: string
  branch: string
  direction: LedgerDirection
  amount: number
  description: string
  category?: string | null
  reference?: string | null
}

export function useLedger() {
  return {
    createEntry: (body: LedgerEntryInput) =>
      $fetch<{ item: LedgerEntry }>('/api/ledger/entries', { method: 'POST', body }),
    updateEntry: (id: string, body: Partial<LedgerEntryInput>) =>
      $fetch<{ item: LedgerEntry }>(`/api/ledger/entries/${id}`, { method: 'PATCH', body }),
    deleteEntry: (id: string) =>
      $fetch(`/api/ledger/entries/${id}`, { method: 'DELETE' }),
  }
}

export interface BalancedEntry extends LedgerEntry {
  balance: number
}

export function computeRunningBalance(entries: LedgerEntry[]): BalancedEntry[] {
  let balance = 0
  return entries.map((e) => {
    const amount = Number(e.amount) || 0
    balance += e.direction === 'in' ? amount : -amount
    return { ...e, balance }
  })
}
