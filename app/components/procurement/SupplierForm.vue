<script setup lang="ts">
import type { Supplier } from '~/types/procurement'

const props = defineProps<{
  visible: boolean
  supplier?: Supplier | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createSupplier, updateSupplier } = useSuppliers()

const isEdit = computed(() => !!props.supplier)
const loading = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  status: 'active' as 'active' | 'inactive',
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const s = props.supplier
    form.name = s?.name ?? ''
    form.email = s?.email ?? ''
    form.phone = s?.phone ?? ''
    form.address = s?.address ?? ''
    form.notes = s?.notes ?? ''
    form.status = s?.status ?? 'active'
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.name.trim()) {
    error.value = 'Supplier name is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }
    if (isEdit.value && props.supplier) await updateSupplier(props.supplier.id, body)
    else await createSupplier(body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save supplier.'
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
    :header="isEdit ? 'Edit supplier' : 'New supplier'"
    :style="{ width: '30rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Name <span class="text-red-500">*</span></label>
        <InputText v-model="form.name" fluid placeholder="e.g. Acme Printing Supplies" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Email</label>
          <InputText v-model="form.email" fluid placeholder="supplier@example.com" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Phone</label>
          <InputText v-model="form.phone" fluid placeholder="+63 900 000 0000" />
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Address</label>
        <Textarea v-model="form.address" rows="2" fluid />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Notes</label>
        <Textarea v-model="form.notes" rows="2" fluid />
      </div>
      <div v-if="isEdit" class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Status</label>
        <Select
          v-model="form.status"
          :options="[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>
    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
