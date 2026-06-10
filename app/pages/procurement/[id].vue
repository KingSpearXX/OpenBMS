<script setup lang="ts">
import type { ProcurementOrderWithLines, ProcurementLine } from '~/types/procurement'

useHead({ title: 'Purchase Order' })

const route = useRoute()
const id = Number(route.params.id)

const { updateOrder, deleteOrder, deleteLine, exportCsv } = useProcurement()

const { data, refresh } = await useFetch<{ item: ProcurementOrderWithLines }>(`/api/procurement/${id}`)
const order = computed(() => data.value?.item ?? null)
const lines = computed<ProcurementLine[]>(() => order.value?.lines ?? [])

const statusSeverity: Record<string, string> = {
  draft: 'secondary',
  sent: 'info',
  received: 'success',
  cancelled: 'danger',
}

// Status transitions
const statusBusy = ref(false)
const statusError = ref('')
async function setStatus(status: string) {
  statusBusy.value = true
  statusError.value = ''
  try {
    await updateOrder(id, { status })
    await refresh()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    statusError.value = err?.data?.statusMessage || 'Could not update status.'
  }
  finally {
    statusBusy.value = false
  }
}

// Order delete
const orderDeleteVisible = ref(false)
const orderDeleteLoading = ref(false)
const orderDeleteError = ref('')
async function confirmDeleteOrder() {
  orderDeleteLoading.value = true
  orderDeleteError.value = ''
  try {
    await deleteOrder(id)
    await navigateTo('/procurement')
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    orderDeleteError.value = err?.data?.statusMessage || 'Could not delete order.'
    orderDeleteLoading.value = false
  }
}

// Line add/edit
const lineFormVisible = ref(false)
const editingLine = ref<ProcurementLine | null>(null)
function addLine() {
  editingLine.value = null
  lineFormVisible.value = true
}
function editLine(l: ProcurementLine) {
  editingLine.value = l
  lineFormVisible.value = true
}

// Line delete
const lineDeleteVisible = ref(false)
const deletingLine = ref<ProcurementLine | null>(null)
const lineDeleteLoading = ref(false)
function askDeleteLine(l: ProcurementLine) {
  deletingLine.value = l
  lineDeleteVisible.value = true
}
async function confirmDeleteLine() {
  if (!deletingLine.value) return
  lineDeleteLoading.value = true
  try {
    await deleteLine(id, deletingLine.value.id)
    lineDeleteVisible.value = false
    await refresh()
  }
  finally {
    lineDeleteLoading.value = false
  }
}

// Totals
const hasAnyUnitCost = computed(() => lines.value.some(l => l.unit_cost != null && Number(l.unit_cost) > 0))
const estimatedTotal = computed(() =>
  lines.value.reduce((sum, l) => sum + (Number(l.unit_cost) || 0) * (Number(l.quantity) || 0), 0),
)

const isDraft = computed(() => order.value?.status === 'draft')
const isSent = computed(() => order.value?.status === 'sent')
const isTerminal = computed(() => ['received', 'cancelled'].includes(order.value?.status ?? ''))

const supplier = computed(() => (typeof order.value?.supplier === 'object' ? order.value?.supplier : null))
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink to="/procurement" class="text-sm text-slate-500 hover:underline">← Procurement</NuxtLink>

    <div v-if="order" class="mt-3">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ order.reference_number ?? `Order #${id}` }}</h1>
        <Tag :value="order.status" :severity="statusSeverity[order.status] ?? 'secondary'" />
        <div class="ml-auto flex gap-2">
          <Button
            icon="pi pi-download"
            label="Export CSV"
            outlined
            size="small"
            @click="exportCsv(id)"
          />
          <Button
            icon="pi pi-trash"
            label="Delete"
            outlined
            severity="danger"
            size="small"
            @click="orderDeleteVisible = true"
          />
        </div>
      </div>

      <!-- Info card -->
      <dl class="mt-4 grid grid-cols-3 gap-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dt class="text-slate-500">Supplier</dt>
        <dd class="col-span-2 font-medium text-slate-900">{{ supplier?.name ?? '—' }}</dd>
        <template v-if="supplier?.email">
          <dt class="text-slate-500">Email</dt>
          <dd class="col-span-2 text-slate-900">{{ supplier.email }}</dd>
        </template>
        <template v-if="supplier?.phone">
          <dt class="text-slate-500">Phone</dt>
          <dd class="col-span-2 text-slate-900">{{ supplier.phone }}</dd>
        </template>
        <dt class="text-slate-500">Date</dt>
        <dd class="col-span-2 text-slate-900">{{ order.order_date ? formatDate(order.order_date) : '—' }}</dd>
        <template v-if="order.notes">
          <dt class="text-slate-500">Notes</dt>
          <dd class="col-span-2 text-slate-900">{{ order.notes }}</dd>
        </template>
        <dt class="text-slate-500">Created</dt>
        <dd class="col-span-2 text-slate-900">{{ order.date_created ? formatDate(order.date_created) : '—' }}</dd>
      </dl>

      <!-- Status actions -->
      <div v-if="!isTerminal" class="mt-4 flex flex-wrap gap-2">
        <Button
          v-if="isDraft"
          label="Mark as Sent"
          icon="pi pi-send"
          :loading="statusBusy"
          @click="setStatus('sent')"
        />
        <Button
          v-if="isSent"
          label="Mark as Received"
          icon="pi pi-check"
          severity="success"
          :loading="statusBusy"
          @click="setStatus('received')"
        />
        <Button
          label="Cancel Order"
          icon="pi pi-times"
          severity="danger"
          outlined
          :loading="statusBusy"
          @click="setStatus('cancelled')"
        />
      </div>
      <Message v-if="statusError" severity="error" :closable="true" class="mt-2" size="small">{{ statusError }}</Message>

      <!-- Lines -->
      <div class="mt-8">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-900">
            Line items <span class="font-normal text-slate-500">({{ lines.length }})</span>
          </h2>
          <Button
            v-if="!isTerminal"
            icon="pi pi-plus"
            label="Add item"
            text
            size="small"
            @click="addLine"
          />
        </div>

        <div class="mt-3 overflow-x-auto">
          <DataTable
            :value="lines"
            data-key="id"
            striped-rows
            :pt="{ table: { class: 'min-w-[36rem]' } }"
          >
            <template #empty><span class="text-sm text-slate-500">No line items yet.</span></template>

            <Column header="Item">
              <template #body="{ data: l }">
                <div>
                  <div class="text-sm text-slate-900">{{ l.item_name }}</div>
                  <div v-if="l.sku" class="text-xs text-slate-400">{{ l.sku }}</div>
                </div>
              </template>
            </Column>

            <Column header="Qty" class="w-24">
              <template #body="{ data: l }">{{ Number(l.quantity) }}<span v-if="l.unit" class="ml-1 text-slate-400 text-xs">{{ l.unit }}</span></template>
            </Column>

            <Column v-if="hasAnyUnitCost" header="Unit cost" class="w-28">
              <template #body="{ data: l }">{{ l.unit_cost != null ? formatCurrency(Number(l.unit_cost)) : '—' }}</template>
            </Column>

            <Column v-if="hasAnyUnitCost" header="Subtotal" class="w-28">
              <template #body="{ data: l }">
                {{ l.unit_cost != null ? formatCurrency(Number(l.unit_cost) * Number(l.quantity)) : '—' }}
              </template>
            </Column>

            <Column header="Notes" class="max-w-[12rem]">
              <template #body="{ data: l }">
                <span class="text-slate-500 text-sm">{{ l.notes || '—' }}</span>
              </template>
            </Column>

            <Column v-if="!isTerminal" header="" class="w-20">
              <template #body="{ data: l }">
                <div class="flex justify-end gap-1">
                  <Button icon="pi pi-pencil" text rounded size="small" @click="editLine(l)" />
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="askDeleteLine(l)" />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <div v-if="hasAnyUnitCost && lines.length" class="mt-3 flex justify-end">
          <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
            <span class="text-slate-500">Estimated total</span>
            <span class="ml-4 font-semibold text-slate-900">{{ formatCurrency(estimatedTotal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <UiConfirmDelete
      v-model:visible="orderDeleteVisible"
      title="Delete purchase order"
      :message="order ? `Delete ${order.reference_number ?? 'this order'}? This cannot be undone.` : ''"
      :loading="orderDeleteLoading"
      @confirm="confirmDeleteOrder"
    />
    <Message v-if="orderDeleteError" severity="error" :closable="true" class="mt-3">{{ orderDeleteError }}</Message>

    <ProcurementLineForm
      v-model:visible="lineFormVisible"
      :order-id="id"
      :line="editingLine"
      @saved="refresh"
    />
    <UiConfirmDelete
      v-model:visible="lineDeleteVisible"
      title="Remove line item"
      :message="deletingLine ? `Remove '${deletingLine.item_name}' from this order?` : ''"
      :loading="lineDeleteLoading"
      @confirm="confirmDeleteLine"
    />
  </div>
</template>
