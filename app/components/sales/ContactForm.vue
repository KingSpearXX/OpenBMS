<script setup lang="ts">
import type { Contact } from '~/types/sales'

const props = defineProps<{
  visible: boolean
  customerId: number
  contact?: Contact | null
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const { createContact, updateContact } = useSales()

const isEdit = computed(() => !!props.contact)
const loading = ref(false)
const error = ref('')

const form = reactive({
  contact_name: '' as string,
  contact_number: '' as string,
  contact_email: '' as string,
  contact_address: '' as string,
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    error.value = ''
    const c = props.contact
    form.contact_name = c?.contact_name ?? ''
    form.contact_number = c?.contact_number ?? ''
    form.contact_email = c?.contact_email ?? ''
    form.contact_address = c?.contact_address ?? ''
  },
)

function close() {
  emit('update:visible', false)
}

async function save() {
  if (!form.contact_name.trim()) {
    error.value = 'Contact name is required.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body = {
      contact_name: form.contact_name.trim(),
      contact_number: form.contact_number || null,
      contact_email: form.contact_email || null,
      contact_address: form.contact_address || null,
    }
    if (isEdit.value && props.contact) await updateContact(props.contact.id, body)
    else await createContact(props.customerId, body)
    emit('saved')
    close()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not save contact.'
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
    :header="isEdit ? 'Edit contact' : 'New contact'"
    :style="{ width: '28rem' }"
    :closable="!loading"
    @update:visible="close"
  >
    <div class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Name</label>
        <InputText v-model="form.contact_name" fluid />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Number</label>
          <InputText v-model="form.contact_number" fluid />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-slate-700">Email</label>
          <InputText v-model="form.contact_email" type="email" fluid />
        </div>
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700">Address</label>
        <Textarea v-model="form.contact_address" rows="2" fluid />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
    </div>

    <template #footer>
      <Button label="Cancel" text :disabled="loading" @click="close" />
      <Button :label="isEdit ? 'Save' : 'Create'" :loading="loading" @click="save" />
    </template>
  </Dialog>
</template>
