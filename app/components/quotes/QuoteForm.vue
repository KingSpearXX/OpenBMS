<script setup lang="ts">
import type { Customer } from '~/types/sales'

const props = defineProps<{
  visible: boolean
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'created', quoteId: string): void
}>()

const { createQuote } = useQuotes()

const { data: customersData } = await useFetch<{ items: Customer[] }>('/api/customers')
const customers = computed(() => customersData.value?.items ?? [])

const loading = ref(false)
const error = ref('')

const form = reactive({
  customer: null as number | null,
  quote_date: new Date() as Date | null,
  expiration_date: null as Date | null,
  notes: '',
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    form.customer = null
    form.quote_date = new Date()
    form.expiration_date = null
    form.notes = ''
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.customer) {
    error.value = 'Please select a customer.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    function ymd(d: Date | null): string | null {
      if (!d) return null
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const result = await createQuote({
      customer: form.customer,
      quote_date: ymd(form.quote_date),
      expiration_date: ymd(form.expiration_date),
      notes: form.notes.trim() || null,
    })
    emit('created', result.id)
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not create quote.'
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
    header="New quote"
    :style="{ width: '28rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Customer <span class="text-red-500">*</span></label>
        <Select
          v-model="form.customer"
          :options="customers"
          option-label="partner_name"
          option-value="id"
          :placeholder="customers.length ? 'Select customer…' : 'No customers'"
          filter
          fluid
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Quote date</label>
        <DatePicker v-model="form.quote_date" date-format="yy-mm-dd" show-icon fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Expiration date</label>
        <DatePicker v-model="form.expiration_date" date-format="yy-mm-dd" show-icon fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Notes</label>
        <Textarea v-model="form.notes" rows="2" fluid placeholder="Optional" />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>
    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button label="Create quote" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
