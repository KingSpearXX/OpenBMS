<script setup lang="ts">
import type { QuoteWithLines, QuoteLine } from '~/types/quotes'
import type { Product } from '~/types/inventory'

useHead({ title: 'Quote' })

const route = useRoute()
const id = String(route.params.id)

const { getQuote, updateQuote, deleteQuote, downloadPdf } = useQuotes()

const quote = ref<QuoteWithLines | null>(null)
const lines = ref<QuoteLine[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadQuote() {
  loading.value = true
  error.value = null
  try {
    const data = await getQuote(id)
    quote.value = data
    lines.value = data.quote_lines ?? []
  } catch {
    error.value = 'Could not load quote.'
  } finally {
    loading.value = false
  }
}

async function refresh() {
  try {
    const data = await getQuote(id)
    quote.value = data
    lines.value = data.quote_lines ?? []
  } catch {
    // ignore on refresh
  }
}

onMounted(loadQuote)

const statusSeverity: Record<string, string> = {
  draft: 'secondary',
  sent: 'info',
  accepted: 'success',
  expired: 'warn',
}

// Editable fields
const editingNotes = ref(false)
const editingTerms = ref(false)
const editingInternal = ref(false)
const editingDates = ref(false)

const notesDraft = ref('')
const termsDraft = ref('')
const internalDraft = ref('')
const quoteDateDraft = ref<Date | null>(null)
const expDateDraft = ref<Date | null>(null)

function startEditNotes() {
  notesDraft.value = quote.value?.notes ?? ''
  editingNotes.value = true
}
function startEditTerms() {
  termsDraft.value = quote.value?.terms_conditions ?? ''
  editingTerms.value = true
}
function startEditInternal() {
  internalDraft.value = quote.value?.internal_notes ?? ''
  editingInternal.value = true
}
function startEditDates() {
  const q = quote.value
  quoteDateDraft.value = q?.quote_date ? new Date(q.quote_date + 'T00:00:00') : null
  expDateDraft.value = q?.expiration_date ? new Date(q.expiration_date + 'T00:00:00') : null
  editingDates.value = true
}

async function saveNotes() {
  if (!quote.value) return
  await updateQuote(id, { notes: notesDraft.value || null })
  editingNotes.value = false
  await refresh()
}
async function saveTerms() {
  if (!quote.value) return
  await updateQuote(id, { terms_conditions: termsDraft.value || null })
  editingTerms.value = false
  await refresh()
}
async function saveInternal() {
  if (!quote.value) return
  await updateQuote(id, { internal_notes: internalDraft.value || null })
  editingInternal.value = false
  await refresh()
}
async function saveDates() {
  if (!quote.value) return
  function ymd(d: Date | null): string | null {
    if (!d) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  await updateQuote(id, {
    quote_date: ymd(quoteDateDraft.value),
    expiration_date: ymd(expDateDraft.value),
  })
  editingDates.value = false
  await refresh()
}

// Status transitions
const statusBusy = ref(false)
const statusError = ref('')
async function setStatus(status: string) {
  statusBusy.value = true
  statusError.value = ''
  try {
    await updateQuote(id, { status })
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

// Delete quote
const quoteDeleteVisible = ref(false)
const quoteDeleteLoading = ref(false)
async function confirmDeleteQuote() {
  quoteDeleteLoading.value = true
  try {
    await deleteQuote(id)
    await navigateTo('/quotes')
  }
  finally {
    quoteDeleteLoading.value = false
  }
}

// Lines
const lineFormVisible = ref(false)
const editingLine = ref<QuoteLine | null>(null)
function addLine() {
  editingLine.value = null
  lineFormVisible.value = true
}
function editLine(l: QuoteLine) {
  editingLine.value = l
  lineFormVisible.value = true
}

// Line delete
const lineDeleteVisible = ref(false)
const deletingLine = ref<QuoteLine | null>(null)
const lineDeleteLoading = ref(false)
function askDeleteLine(l: QuoteLine) {
  deletingLine.value = l
  lineDeleteVisible.value = true
}
async function confirmDeleteLine() {
  if (!deletingLine.value) return
  lineDeleteLoading.value = true
  try {
    await $fetch(`/api/quotes/${id}/lines/${deletingLine.value.id}`, { method: 'DELETE' })
    lines.value = lines.value.filter(l => l.id !== deletingLine.value!.id)
    lineDeleteVisible.value = false
    await refresh()
  }
  finally {
    lineDeleteLoading.value = false
  }
}

// Totals
const subtotal = computed(() =>
  lines.value.reduce((sum, l) => sum + (Number(l.unit_price) || 0) * (Number(l.quantity) || 0), 0),
)
const discountAmount = computed(() => {
  const discPct = Number(quote.value?.discount_percent) || 0
  return subtotal.value * (discPct / 100)
})
const afterDiscount = computed(() => subtotal.value - discountAmount.value)
const taxAmount = computed(() => {
  const taxPct = Number(quote.value?.tax_percent) || 0
  return afterDiscount.value * (taxPct / 100)
})
const grandTotal = computed(() => afterDiscount.value + taxAmount.value)

// Recalc totals
const recalcBusy = ref(false)
async function recalcAndSave() {
  recalcBusy.value = true
  try {
    await updateQuote(id, {
      subtotal: Math.round(subtotal.value * 100) / 100,
      discount_amount: Math.round(discountAmount.value * 100) / 100,
      tax_amount: Math.round(taxAmount.value * 100) / 100,
      total: Math.round(grandTotal.value * 100) / 100,
    })
    await refresh()
  }
  finally {
    recalcBusy.value = false
  }
}

// Computed state flags
const isDraft = computed(() => quote.value?.status === 'draft')
const isSent = computed(() => quote.value?.status === 'sent')
const isTerminal = computed(() => ['accepted', 'expired'].includes(quote.value?.status ?? ''))

const customer = computed(() => (typeof quote.value?.customer === 'object' ? quote.value?.customer : null))

function money(value: number | string | null): string {
  return value == null ? '—' : formatCurrency(Number(value))
}
</script>

<template>
  <div class="max-w-4xl">
    <NuxtLink to="/quotes" class="text-sm text-slate-500 hover:underline">← Quotes</NuxtLink>

    <div v-if="loading" class="mt-8 flex justify-center">
      <i class="pi pi-spin pi-spinner text-2xl text-slate-400"></i>
    </div>
    <Message v-else-if="error" severity="error" :closable="false" class="mt-4">
      {{ error }}
      <Button label="Retry" text size="small" class="ml-2" @click="loadQuote" />
    </Message>
    <div v-else-if="quote" class="mt-3">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-semibold text-slate-900">
          Quote for {{ customer?.partner_name ?? '—' }}
        </h1>
        <Tag :value="quote.status" :severity="statusSeverity[quote.status] ?? 'secondary'" />
        <div class="ml-auto flex gap-2">
          <Button
            icon="pi pi-file-pdf"
            label="PDF"
            outlined
            size="small"
            @click="downloadPdf(id)"
          />
          <Button
            icon="pi pi-trash"
            label="Delete"
            outlined
            severity="danger"
            size="small"
            @click="quoteDeleteVisible = true"
          />
        </div>
      </div>

      <!-- Info card -->
      <dl class="mt-4 grid grid-cols-3 gap-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <dt class="text-slate-500">Customer</dt>
        <dd class="col-span-2 font-medium text-slate-900">
          <NuxtLink :to="`/customers/${customer?.id}`" class="hover:underline">{{ customer?.partner_name ?? '—' }}</NuxtLink>
        </dd>

        <dt class="text-slate-500">Quote date</dt>
        <dd class="col-span-2 text-slate-900">
          <template v-if="editingDates">
            <div class="flex items-center gap-2">
              <div class="flex gap-2">
                <div class="space-y-0.5">
                  <label class="text-xs text-slate-400">Quote date</label>
                  <DatePicker v-model="quoteDateDraft" date-format="yy-mm-dd" show-icon />
                </div>
                <div class="space-y-0.5">
                  <label class="text-xs text-slate-400">Expires</label>
                  <DatePicker v-model="expDateDraft" date-format="yy-mm-dd" show-icon />
                </div>
              </div>
              <Button icon="pi pi-check" text rounded size="small" :loading="statusBusy" @click="saveDates" />
              <Button icon="pi pi-times" text rounded size="small" @click="editingDates = false" />
            </div>
          </template>
          <template v-else>
            <span>{{ quote.quote_date ? formatDate(quote.quote_date) : '—' }}</span>
            <Button icon="pi pi-pencil" text rounded size="small" class="ml-1" @click="startEditDates" />
          </template>
        </dd>

        <dt class="text-slate-500">Expiration</dt>
        <dd class="col-span-2 text-slate-900">{{ quote.expiration_date ? formatDate(quote.expiration_date) : '—' }}</dd>

        <template v-if="quote.date_created">
          <dt class="text-slate-500">Created</dt>
          <dd class="col-span-2 text-slate-900">{{ formatDate(quote.date_created) }}</dd>
        </template>
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
          label="Mark as Accepted"
          icon="pi pi-check"
          severity="success"
          :loading="statusBusy"
          @click="setStatus('accepted')"
        />
        <Button
          label="Mark as Expired"
          icon="pi pi-clock"
          severity="warn"
          outlined
          :loading="statusBusy"
          @click="setStatus('expired')"
        />
      </div>
      <Message v-if="statusError" severity="error" :closable="true" class="mt-2" size="small">{{ statusError }}</Message>

      <!-- Line items -->
      <div class="mt-8">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-900">
            Line items <span class="font-normal text-slate-500">({{ lines.length }})</span>
          </h2>
          <div class="flex items-center gap-2">
            <Button
              v-if="!isTerminal"
              icon="pi pi-calculator"
              text
              rounded
              size="small"
              :loading="recalcBusy"
              :title="'Recalculate totals from line items'"
              @click="recalcAndSave"
            />
            <Button
              v-if="!isTerminal"
              icon="pi pi-plus"
              label="Add item"
              text
              size="small"
              @click="addLine"
            />
          </div>
        </div>

        <div class="mt-3 overflow-x-auto">
          <DataTable
            :value="lines"
            data-key="id"
            striped-rows
            :pt="{ table: { class: 'min-w-[48rem]' } }"
          >
            <template #empty><span class="text-sm text-slate-500">No line items yet.</span></template>

            <Column header="Type" class="w-20">
              <template #body="{ data: l }">
                <Tag :value="l.line_type" :severity="l.line_type === 'product' ? 'info' : 'secondary'" />
              </template>
            </Column>

            <Column header="Description">
              <template #body="{ data: l }">
                <span class="text-sm text-slate-900">{{ l.description || '—' }}</span>
              </template>
            </Column>

            <Column header="Qty" class="w-20">
              <template #body="{ data: l }">{{ l.quantity != null ? Number(l.quantity) : '—' }}</template>
            </Column>

            <Column header="Unit price" class="w-28">
              <template #body="{ data: l }">{{ l.unit_price != null ? money(l.unit_price) : '—' }}</template>
            </Column>

            <Column header="Disc %" class="w-20">
              <template #body="{ data: l }">{{ l.discount_percent != null ? `${l.discount_percent}%` : '—' }}</template>
            </Column>

            <Column header="Tax %" class="w-20">
              <template #body="{ data: l }">{{ l.tax_percent != null ? `${l.tax_percent}%` : '—' }}</template>
            </Column>

            <Column header="Amount" class="w-28">
              <template #body="{ data: l }">{{ money(l.amount) }}</template>
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

        <!-- Totals section -->
        <div class="mt-4 flex justify-end">
          <div class="w-72 space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-500">Subtotal</span>
              <span class="text-slate-900">{{ money(subtotal) }}</span>
            </div>
            <div v-if="quote.discount_percent" class="flex justify-between">
              <span class="text-slate-500">Discount ({{ quote.discount_percent }}%)</span>
              <span class="text-slate-900">-{{ money(discountAmount) }}</span>
            </div>
            <div v-if="quote.tax_percent" class="flex justify-between">
              <span class="text-slate-500">Tax ({{ quote.tax_percent }}%)</span>
              <span class="text-slate-900">{{ money(taxAmount) }}</span>
            </div>
            <hr class="border-slate-200" />
            <div class="flex justify-between font-semibold text-slate-900">
              <span>Grand total</span>
              <span>{{ money(grandTotal) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Notes</h2>
            <Button v-if="!isTerminal && !editingNotes" icon="pi pi-pencil" text rounded size="small" @click="startEditNotes" />
          </div>
          <div class="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <p v-if="!editingNotes" class="text-slate-700 whitespace-pre-wrap">{{ quote.notes || '—' }}</p>
            <div v-else class="space-y-2">
              <Textarea v-model="notesDraft" rows="4" fluid />
              <div class="flex gap-2">
                <Button label="Save" size="small" @click="saveNotes" />
                <Button label="Cancel" text size="small" @click="editingNotes = false" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Terms &amp; Conditions</h2>
            <Button v-if="!isTerminal && !editingTerms" icon="pi pi-pencil" text rounded size="small" @click="startEditTerms" />
          </div>
          <div class="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <p v-if="!editingTerms" class="text-slate-700 whitespace-pre-wrap">{{ quote.terms_conditions || '—' }}</p>
            <div v-else class="space-y-2">
              <Textarea v-model="termsDraft" rows="4" fluid />
              <div class="flex gap-2">
                <Button label="Save" size="small" @click="saveTerms" />
                <Button label="Cancel" text size="small" @click="editingTerms = false" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Internal notes -->
      <div class="mt-6">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-900">Internal notes</h2>
          <Button v-if="!isTerminal && !editingInternal" icon="pi pi-pencil" text rounded size="small" @click="startEditInternal" />
        </div>
        <div class="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p v-if="!editingInternal" class="text-slate-700 whitespace-pre-wrap">{{ quote.internal_notes || '—' }}</p>
          <div v-else class="space-y-2">
            <Textarea v-model="internalDraft" rows="3" fluid />
            <div class="flex gap-2">
              <Button label="Save" size="small" @click="saveInternal" />
              <Button label="Cancel" text size="small" @click="editingInternal = false" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <UiConfirmDelete
      v-model:visible="quoteDeleteVisible"
      title="Delete quote"
      :message="`Delete this quote? This cannot be undone.`"
      :loading="quoteDeleteLoading"
      @confirm="confirmDeleteQuote"
    />

    <QuotesLineForm
      v-model:visible="lineFormVisible"
      :quote-id="id"
      :line="editingLine"
      @saved="refresh"
    />

    <UiConfirmDelete
      v-model:visible="lineDeleteVisible"
      title="Remove line item"
      :message="deletingLine ? `Remove this line item from the quote?` : ''"
      :loading="lineDeleteLoading"
      @confirm="confirmDeleteLine"
    />
  </div>
</template>
