<script setup lang="ts">
import type { Expense } from '~/types/expenses'
import type { Branch } from '~/types/inventory'

const props = defineProps<{
  visible: boolean
  expense?: Expense | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createExpense, updateExpense, uploadReceipt } = useExpenses()

const isEdit = computed(() => !!props.expense)
const loading = ref(false)
const error = ref('')

const { data: branchData } = useFetch<{ items: Branch[] }>('/api/inventory/branches')
const branches = computed(() => branchData.value?.items ?? [])

const form = reactive({
  amount: null as number | null,
  category: null as string | null,
  description: '' as string,
  branch: null as string | null,
})
const file = ref<File | null>(null)
const existingAttachment = ref<string | null>(null)

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    file.value = null
    const e = props.expense
    form.amount = e?.expense_amount != null ? Number(e.expense_amount) : null
    form.category = e?.expense_category ?? null
    form.description = e?.expense_description ?? ''
    form.branch = e?.branch ?? null
    existingAttachment.value = e?.expense_attachment ?? null
  },
)

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

function close() {
  emit('update:visible', false)
}

async function save() {
  if (form.amount == null || form.amount <= 0) {
    error.value = 'Amount must be greater than zero.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    let attachment = existingAttachment.value
    if (file.value) {
      attachment = await uploadReceipt(file.value)
    }
    const body = {
      expense_amount: form.amount,
      expense_category: form.category || null,
      expense_description: form.description || null,
      expense_attachment: attachment,
      branch: form.branch || null,
    }
    if (isEdit.value && props.expense) await updateExpense(props.expense.id, body)
    else await createExpense(body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save expense.'
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
    :header="isEdit ? 'Edit expense' : 'New expense'"
    :style="{ width: '30rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Amount</label>
          <InputNumber v-model="form.amount" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Category</label>
          <Select v-model="form.category" :options="EXPENSE_CATEGORIES" editable show-clear placeholder="—" fluid />
        </div>
      </div>
      <div v-if="branches.length" class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Branch</label>
        <Select v-model="form.branch" :options="branches" option-label="shop_name" option-value="id" show-clear placeholder="All branches" fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Description</label>
        <Textarea v-model="form.description" rows="2" fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Receipt</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-slate-700 hover:file:bg-slate-50"
          @change="onFile"
        >
        <p v-if="existingAttachment && !file" class="text-xs text-slate-500">
          Current:
          <a :href="`/api/expenses/attachment/${existingAttachment}`" target="_blank" class="text-slate-700 underline">view receipt</a>
          <span class="text-slate-400"> — choose a file to replace.</span>
        </p>
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
