<script setup lang="ts">
import type { Customer } from '~/types/sales'

const props = defineProps<{
  visible: boolean
  customer?: Customer | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createCustomer, updateCustomer } = useSales()

const isEdit = computed(() => !!props.customer)
const loading = ref(false)
const error = ref('')

const form = reactive({
  partner_name: '' as string,
  credit: null as number | null,
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const c = props.customer
    form.partner_name = c?.partner_name ?? ''
    form.credit = c?.credit != null ? Number(c.credit) : null
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.partner_name.trim()) {
    error.value = 'Name is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = { partner_name: form.partner_name.trim(), credit: form.credit }
    if (isEdit.value && props.customer) await updateCustomer(props.customer.id, body)
    else await createCustomer(body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save customer.'
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
    :header="isEdit ? 'Edit customer' : 'New customer'"
    :style="{ width: '28rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Name</label>
        <InputText v-model="form.partner_name" fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Store credit</label>
        <InputNumber v-model="form.credit" mode="decimal" :max-fraction-digits="2" fluid />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
