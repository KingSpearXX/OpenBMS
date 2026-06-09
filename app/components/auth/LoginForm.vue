<script setup lang="ts">
const emit = defineEmits<{ (e: 'success'): void }>()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const remember = ref(true)
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value, remember.value)
    emit('success')
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string }, statusMessage?: string }
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Sign in failed. Please try again.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <div class="space-y-1.5">
      <label for="email" class="text-sm font-medium text-slate-700">Email</label>
      <InputText
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        required
        fluid
      />
    </div>

    <div class="space-y-1.5">
      <label for="password" class="text-sm font-medium text-slate-700">Password</label>
      <Password
        id="password"
        v-model="password"
        :feedback="false"
        toggle-mask
        autocomplete="current-password"
        required
        fluid
      />
    </div>

    <div class="flex items-center justify-between">
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <Checkbox v-model="remember" binary />
        Remember me
      </label>
      <NuxtLink to="/forgot-password" class="text-sm text-slate-700 hover:underline">
        Forgot password?
      </NuxtLink>
    </div>

    <Message v-if="error" severity="error" :closable="false" size="small">
      {{ error }}
    </Message>

    <Button type="submit" label="Sign in" :loading="loading" fluid />
  </form>
</template>
