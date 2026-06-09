import type { Contact, Customer, Employee, Order, OrderLine } from '~/types/sales'

// Client wrapper over the authenticated BFF customers/orders endpoints. Same pattern as
// useInventory: mutations run in the browser (same-origin cookies carry the session).

export interface CustomerInput {
  partner_name: string
  credit?: number | null
}

export interface ContactInput {
  contact_name?: string | null
  contact_address?: string | null
  contact_number?: string | null
  contact_email?: string | null
}

export interface OrderInput {
  partner_id: number
  sales_employee?: string | null
  tax?: number | null
  discount?: string | null
  downpayment?: number | null
  shipping_address?: string | null
  remarks?: string | null
  paid?: boolean
  shipped?: boolean
  completed?: boolean
}

export interface OrderLineInput {
  product_name: string
  quantity: number
  unit_price: number
  discount?: number | null
  // Catalog product id; persisted as the order_lines.product FK when that column exists.
  product?: number | null
}

export function useSales() {
  return {
    // Lookups
    fetchEmployees: () =>
      $fetch<{ items: Employee[] }>('/api/orders/employees').then(r => r.items),

    // Customers
    createCustomer: (body: CustomerInput) =>
      $fetch<{ item: Customer }>('/api/customers', { method: 'POST', body }),
    updateCustomer: (id: number, body: Partial<CustomerInput>) =>
      $fetch<{ item: Customer }>(`/api/customers/${id}`, { method: 'PATCH', body }),
    deleteCustomer: (id: number) =>
      $fetch(`/api/customers/${id}`, { method: 'DELETE' }),

    // Contacts
    createContact: (customerId: number, body: ContactInput) =>
      $fetch<{ item: Contact }>('/api/contacts', { method: 'POST', body: { ...body, partner_id: customerId } }),
    updateContact: (id: number, body: Partial<ContactInput>) =>
      $fetch<{ item: Contact }>(`/api/contacts/${id}`, { method: 'PATCH', body }),
    deleteContact: (id: number) =>
      $fetch(`/api/contacts/${id}`, { method: 'DELETE' }),

    // Orders
    createOrder: (body: OrderInput) =>
      $fetch<{ item: Order }>('/api/orders', { method: 'POST', body }),
    updateOrder: (id: number, body: Partial<OrderInput>) =>
      $fetch<{ item: Order }>(`/api/orders/${id}`, { method: 'PATCH', body }),
    deleteOrder: (id: number) =>
      $fetch(`/api/orders/${id}`, { method: 'DELETE' }),

    // Order lines (BFF recomputes line_total + order total)
    createLine: (orderId: number, body: OrderLineInput) =>
      $fetch<{ item: OrderLine }>(`/api/orders/${orderId}/lines`, { method: 'POST', body }),
    updateLine: (id: number, body: Partial<OrderLineInput>) =>
      $fetch<{ item: OrderLine }>(`/api/order-lines/${id}`, { method: 'PATCH', body }),
    deleteLine: (id: number) =>
      $fetch(`/api/order-lines/${id}`, { method: 'DELETE' }),
  }
}
