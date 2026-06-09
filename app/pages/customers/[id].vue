<script setup lang="ts">
import type { Contact, Customer, Employee, Order } from '~/types/sales'

const route = useRoute()
const id = Number(route.params.id)

const { data, error, refresh } = await useFetch<{ item: Customer }>(`/api/customers/${id}`)
const { data: ordersData, refresh: refreshOrders } = await useFetch<{ items: Order[] }>('/api/orders', { query: { customer: id } })
const { data: empData } = await useFetch<{ items: Employee[] }>('/api/orders/employees')

const customer = computed(() => data.value?.item ?? null)
const contacts = computed<Contact[]>(() => customer.value?.contact_entity ?? [])
const orders = computed(() => ordersData.value?.items ?? [])
const employees = computed(() => empData.value?.items ?? [])

// Open vs completed filter for the orders table.
const orderStatusFilter = ref<'all' | 'open' | 'completed'>('all')
const orderStatusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Completed', value: 'completed' },
]
const filteredOrders = computed(() => {
  if (orderStatusFilter.value === 'completed') return orders.value.filter(o => o.completed)
  if (orderStatusFilter.value === 'open') return orders.value.filter(o => !o.completed)
  return orders.value
})

// Create an order for this customer, then open it to add line items.
const orderFormVisible = ref(false)
async function onOrderSaved(orderId: number) {
  await refreshOrders()
  await navigateTo(`/orders/${orderId}`)
}

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}

// Edit customer
const editVisible = ref(false)

// Contacts
const contactVisible = ref(false)
const editingContact = ref<Contact | null>(null)
function addContact() {
  editingContact.value = null
  contactVisible.value = true
}
function editContact(c: Contact) {
  editingContact.value = c
  contactVisible.value = true
}

const { deleteContact, updateOrder } = useSales()

// Quick status toggles on the orders table.
const busyOrderId = ref<number | null>(null)
async function setOrderStatus(order: Order, field: 'paid' | 'shipped' | 'completed', value: boolean) {
  busyOrderId.value = order.id
  try {
    await updateOrder(order.id, { [field]: value })
    await refreshOrders()
  }
  finally {
    busyOrderId.value = null
  }
}

const cDeleteVisible = ref(false)
const cDeleting = ref<Contact | null>(null)
const cDeleteLoading = ref(false)
function askDeleteContact(c: Contact) {
  cDeleting.value = c
  cDeleteVisible.value = true
}
async function confirmDeleteContact() {
  if (!cDeleting.value) return
  cDeleteLoading.value = true
  try {
    await deleteContact(cDeleting.value.id)
    cDeleteVisible.value = false
    await refresh()
  }
  finally {
    cDeleteLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink to="/customers" class="text-sm text-slate-500 hover:underline">← Customers</NuxtLink>

    <Message v-if="error" severity="error" :closable="false" class="mt-4">Couldn't load this customer.</Message>

    <div v-else-if="customer" class="mt-3">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ customer.partner_name || '(unnamed)' }}</h1>
        <Button icon="pi pi-pencil" label="Edit" outlined size="small" class="ml-auto" @click="editVisible = true" />
      </div>

      <dl class="mt-6 grid grid-cols-3 gap-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dt class="text-slate-500">Store credit</dt>
        <dd class="col-span-2 text-slate-900">{{ money(customer.credit) }}</dd>
        <dt class="text-slate-500">Customer since</dt>
        <dd class="col-span-2 text-slate-900">{{ customer.date_created ? formatDate(customer.date_created) : '—' }}</dd>
      </dl>

      <!-- Contacts -->
      <div class="mt-8 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-900">Contacts</h2>
        <Button icon="pi pi-plus" label="Add contact" text size="small" @click="addContact" />
      </div>
      <div class="mt-3 overflow-x-auto">
        <DataTable
          :value="contacts"
          data-key="id"
          striped-rows
          paginator
          :rows="5"
          :rows-per-page-options="[5, 10, 25]"
          :paginator-template="{
            '640px': 'PrevPageLink CurrentPageReport NextPageLink',
            '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
            default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
          }"
          current-page-report-template="{currentPage} / {totalPages}"
          :pt="{ table: { class: 'min-w-[34rem]' } }"
        >
          <template #empty><span class="text-sm text-slate-500">No contacts.</span></template>
          <Column field="contact_name" header="Name" />
          <Column field="contact_number" header="Number">
            <template #body="{ data: row }">{{ row.contact_number || '—' }}</template>
          </Column>
          <Column field="contact_email" header="Email">
            <template #body="{ data: row }">{{ row.contact_email || '—' }}</template>
          </Column>
          <Column header="" class="w-24">
            <template #body="{ data: row }">
              <div class="flex justify-end gap-1">
                <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" @click="editContact(row)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Delete" @click="askDeleteContact(row)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Orders -->
      <div class="mt-8 flex flex-wrap items-center gap-2">
        <h2 class="text-sm font-semibold text-slate-900">Orders</h2>
        <SelectButton
          v-model="orderStatusFilter"
          :options="orderStatusOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
          class="ml-auto"
        />
        <Button icon="pi pi-plus" label="New order" text size="small" @click="orderFormVisible = true" />
      </div>
      <div class="mt-3 overflow-x-auto">
        <DataTable
          :value="filteredOrders"
          data-key="id"
          striped-rows
          paginator
          :rows="5"
          :rows-per-page-options="[5, 10, 25]"
          :paginator-template="{
            '640px': 'PrevPageLink CurrentPageReport NextPageLink',
            '960px': 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
            default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
          }"
          current-page-report-template="{currentPage} / {totalPages}"
          :pt="{ table: { class: 'min-w-[40rem]' } }"
        >
          <template #empty><span class="text-sm text-slate-500">No orders yet.</span></template>
          <Column header="Order">
            <template #body="{ data: row }">
              <NuxtLink :to="`/orders/${row.id}`" class="text-slate-900 hover:underline">#{{ row.id }}</NuxtLink>
            </template>
          </Column>
          <Column header="Date">
            <template #body="{ data: row }">{{ row.order_date ? formatDate(row.order_date) : '—' }}</template>
          </Column>
          <Column header="Total">
            <template #body="{ data: row }">{{ money(row.total) }}</template>
          </Column>
          <Column header="Paid">
            <template #body="{ data: row }">
              <Checkbox :model-value="!!row.paid" binary :disabled="busyOrderId === row.id" @update:model-value="setOrderStatus(row, 'paid', $event)" />
            </template>
          </Column>
          <Column header="Shipped">
            <template #body="{ data: row }">
              <Checkbox :model-value="!!row.shipped" binary :disabled="busyOrderId === row.id" @update:model-value="setOrderStatus(row, 'shipped', $event)" />
            </template>
          </Column>
          <Column header="Completed">
            <template #body="{ data: row }">
              <Checkbox :model-value="!!row.completed" binary :disabled="busyOrderId === row.id" @update:model-value="setOrderStatus(row, 'completed', $event)" />
            </template>
          </Column>
        </DataTable>
      </div>

      <SalesCustomerForm v-model:visible="editVisible" :customer="customer" @saved="refresh" />
      <SalesContactForm
        v-model:visible="contactVisible"
        :customer-id="id"
        :contact="editingContact"
        @saved="refresh"
      />
      <UiConfirmDelete
        v-model:visible="cDeleteVisible"
        title="Delete contact"
        :message="cDeleting ? `Delete contact “${cDeleting.contact_name || ''}”?` : ''"
        :loading="cDeleteLoading"
        @confirm="confirmDeleteContact"
      />
      <SalesOrderForm
        v-if="customer"
        v-model:visible="orderFormVisible"
        :customers="[customer]"
        :employees="employees"
        :locked-customer="id"
        @saved="onOrderSaved"
      />
    </div>
  </div>
</template>
