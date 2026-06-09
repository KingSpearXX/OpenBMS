// Directus returns numeric/decimal/float columns as strings (precision-preserving),
// so money and quantity fields are typed `number | string | null` and coerced in the UI.

export interface Contact {
  id: number
  contact_name: string | null
  contact_address: string | null
  contact_number: string | null
  contact_email: string | null
  partner_id?: number | null
}

export interface Customer {
  id: number
  partner_name: string | null
  credit: number | string | null
  date_created?: string | null
  // Expanded on detail reads (o2m via contacts.partner_id).
  contact_entity?: Contact[]
}

export interface Employee {
  id: string
  name: string
}

export interface Order {
  id: number
  total: number | string | null
  tax: number | string | null
  discount: string | null
  downpayment: number | string | null
  shipping_address: string | null
  remarks: string | null
  paid: boolean | null
  shipped: boolean | null
  completed: boolean | null
  order_date: string | null
  order_updated?: string | null
  partner_id: Pick<Customer, 'id' | 'partner_name'> | number | null
  sales_employee: Employee | string | null
}

export interface OrderLine {
  id: number
  product_name: string | null
  quantity: number | string | null
  unit_price: number | string | null
  discount: number | string | null
  line_total: number | string | null
  // Optional FK to products (present only once the `order_lines.product` column is added).
  product?: number | null
  order_id?: number | null
}
