export type LedgerDirection = 'in' | 'out'

export interface LedgerEntry {
  id: string
  entry_date: string
  branch: string | null
  direction: LedgerDirection
  amount: number | string
  description: string
  category: string | null
  reference: string | null
  date_created?: string | null
}

export interface LedgerBranch {
  id: string
  shop_name: string
}
