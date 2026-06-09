<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const loading = ref(false)
const sent = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await $fetch('/api/auth/password/request', { method: 'POST', body: { email: email.value } })
    sent.value = true
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-base font-semibold text-slate-900">Reset password</h1>

    <div v-if="sent" class="space-y-4">
      <Message severity="success" :closable="false">
        If an account exists for that email, a reset link is on its way.
      </Message>
      <NuxtLink to="/login" class="block text-center text-sm text-slate-700 hover:underline">
        Back to sign in
      </NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <p class="text-sm text-slate-500">Enter your email and we'll send a reset link.</p>
      <div class="space-y-1.5">
        <label for="email" class="text-sm font-medium text-slate-700">Email</label>
        <InputText id="email" v-model="email" type="email" autocomplete="email" required fluid />
      </div>
      <Button type="submit" label="Send reset link" :loading="loading" fluid />
      <NuxtLink to="/login" class="block text-center text-sm text-slate-700 hover:underline">
        Back to sign in
      </NuxtLink>
    </form>
  </div>
</template>
