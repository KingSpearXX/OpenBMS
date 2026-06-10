<script setup lang="ts">
import type { LedgerEntry, LedgerDirection } from '~/types/ledger'

const props = defineProps<{
  visible: boolean
  entry?: LedgerEntry | null
  branchId: string
  branchName: string
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createEntry, updateEntry } = useLedger()

const isEdit = computed(() => !!props.entry)
const loading = ref(false)
const error = ref('')

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const form = reactive({
  entryDate: new Date() as Date | null,
  direction: 'in' as LedgerDirection,
  amount: null as number | null,
  description: '',
  category: null as string | null,
  reference: '',
})

const directionOptions = [
  { label: 'Cash In', value: 'in' },
  { label: 'Cash Out', value: 'out' },
]

const categoryOptions = computed(() =>
  form.direction === 'in' ? LEDGER_IN_CATEGORIES : LEDGER_OUT_CATEGORIES,
)

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const e = props.entry
    form.entryDate = e ? parseLocalDate(e.entry_date) : new Date()
    form.direction = e?.direction ?? 'in'
    form.amount = e?.amount != null ? Number(e.amount) : null
    form.description = e?.description ?? ''
    form.category = e?.category ?? null
    form.reference = e?.reference ?? ''
  },
)

watch(
  () => form.direction,
  () => {
    const opts = form.direction === 'in' ? LEDGER_IN_CATEGORIES : LEDGER_OUT_CATEGORIES
    if (form.category && !opts.includes(form.category)) form.category = null
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.entryDate) { error.value = 'Date is required.'; return }
  if (form.amount == null || form.amount <= 0) { error.value = 'Amount must be greater than zero.'; return }
  if (!form.description.trim()) { error.value = 'Description is required.'; return }
  loading.value = true
  error.value = ''
  try {
    const body = {
      entry_date: ymd(form.entryDate),
      branch: props.branchId,
      direction: form.direction,
      amount: form.amount,
      description: form.description.trim(),
      category: form.category || null,
      reference: form.reference || null,
    }
    if (isEdit.value && props.entry) await updateEntry(props.entry.id, body)
    else await createEntry(body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save entry.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :header="isEdit ? 'Edit entry' : 'New ledger entry'"
    :style="{ width: '32rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Date</label>
          <DatePicker v-model="form.entryDate" :manual-input="false" date-format="yy-mm-dd" show-icon fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Branch</label>
          <InputText :value="props.branchName" disabled fluid />
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Direction</label>
        <SelectButton
          v-model="form.direction"
          :options="directionOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Amount</label>
          <InputNumber v-model="form.amount" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Category</label>
          <Select v-model="form.category" :options="categoryOptions" editable show-clear placeholder="—" fluid />
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Description <span class="text-red-500">*</span></label>
        <Textarea v-model="form.description" rows="2" fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Reference</label>
        <InputText v-model="form.reference" placeholder="Receipt / ref no." fluid />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>
    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
