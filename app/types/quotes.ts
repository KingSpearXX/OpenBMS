// Directus returns decimal columns as strings — money fields typed accordingly.

export interface QuoteLine {
  id: string
  quote: string | null
  line_type: 'product' | 'free_text'
  product: number | null
  description: string | null
  quantity: number | string | null
  unit_price: number | string | null
  discount_percent: number | string | null
  discount_amount: number | string | null
  tax_percent: number | string | null
  amount: number | string | null
  sort?: number | null
}

export interface Quote {
  id: string
  status: 'draft' | 'sent' | 'accepted' | 'expired'
  customer: { id: number; partner_name: string; credit?: number | string | null } | number | null
  quote_date: string | null
  expiration_date: string | null
  subtotal: number | string | null
  discount_percent: number | string | null
  discount_amount: number | string | null
  tax_percent: number | string | null
  tax_amount: number | string | null
  total: number | string | null
  notes: string | null
  terms_conditions: string | null
  internal_notes: string | null
  date_created?: string | null
  date_updated?: string | null
}

export interface QuoteWithLines extends Omit<Quote, 'customer'> {
  customer: { id: number; partner_name: string; credit?: number | string | null } | null
  quote_lines: QuoteLine[]
}

export interface QuoteInput {
  customer: number
  quote_date?: string | null
  expiration_date?: string | null
  notes?: string | null
  terms_conditions?: string | null
  internal_notes?: string | null
}

export interface LineInput {
  line_type: 'product' | 'free_text'
  product?: number | null
  description?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  discount_percent?: number | string | null
  discount_amount?: number | string | null
  tax_percent?: number | string | null
  amount?: number | string | null
}
