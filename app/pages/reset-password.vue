<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

async function onSubmit() {
  error.value = ''
  if (!token.value) {
    error.value = 'This reset link is missing its token.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/password/reset', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    done.value = true
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Reset failed. Please request a new link.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-base font-semibold text-slate-900">Set a new password</h1>

    <div v-if="done" class="space-y-4">
      <Message severity="success" :closable="false">Your password has been reset.</Message>
      <NuxtLink to="/login" class="block text-center text-sm text-slate-700 hover:underline">
        Sign in
      </NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div class="space-y-1.5">
        <label for="pw" class="text-sm font-medium text-slate-700">New password</label>
        <Password id="pw" v-model="password" toggle-mask autocomplete="new-password" required fluid />
      </div>
      <div class="space-y-1.5">
        <label for="cpw" class="text-sm font-medium text-slate-700">Confirm password</label>
        <Password id="cpw" v-model="confirm" :feedback="false" toggle-mask autocomplete="new-password" required fluid />
      </div>
      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>
      <Button type="submit" label="Reset password" :loading="loading" fluid />
    </form>
  </div>
</template>
