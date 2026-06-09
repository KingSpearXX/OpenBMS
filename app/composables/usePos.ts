import type { PaymentMethod, PosSale } from '~/types/pos'

export const PAYMENT_METHODS: { label: string, value: PaymentMethod }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'Deposit', value: 'deposit' },
]

export function paymentLabel(value: string | null | undefined): string {
  return PAYMENT_METHODS.find(m => m.value === value)?.label ?? (value || '—')
}

export interface SaleInput {
  product_name: string
  unit_price: number
  quantity: number
  payment_method: PaymentMethod
  sales_branch?: string | null
  sold_at?: string | null
  product?: number | null
}

export interface SaleFilters {
  from?: string
  to?: string
  branch?: string
  method?: string
}

export function usePos() {
  return {
    createSale: (body: SaleInput) =>
      $fetch<{ item: PosSale }>('/api/pos/sales', { method: 'POST', body }),
    updateSale: (id: string, body: Partial<SaleInput>) =>
      $fetch<{ item: PosSale }>(`/api/pos/sales/${id}`, { method: 'PATCH', body }),
    deleteSale: (id: string) =>
      $fetch(`/api/pos/sales/${id}`, { method: 'DELETE' }),
  }
}
