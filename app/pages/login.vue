<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { user } = useAuth()
const { isEnabled, loginWithPin } = usePin()

const mode = ref<'pin' | 'password'>(isEnabled.value ? 'pin' : 'password')
const pinError = ref('')
const pinLoading = ref(false)
const pad = ref<{ clear: () => void } | null>(null)

function redirectTarget() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/'
}

async function onSuccess() {
  await navigateTo(redirectTarget())
}

async function onPin(pin: string) {
  pinError.value = ''
  pinLoading.value = true
  try {
    user.value = await loginWithPin(pin)
    await onSuccess()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    pinError.value = err?.data?.statusMessage || 'PIN sign in failed.'
    pad.value?.clear()
  }
  finally {
    pinLoading.value = false
  }
}
</script>

<template>
  <div>
    <template v-if="mode === 'pin'">
      <h1 class="mb-2 text-base font-semibold text-slate-900">Quick sign in</h1>
      <p class="mb-5 text-sm text-slate-500">Enter your PIN.</p>
      <AuthPinPad ref="pad" :loading="pinLoading" @complete="onPin" />
      <Message v-if="pinError" severity="error" :closable="false" size="small" class="mt-4">
        {{ pinError }}
      </Message>
      <button
        type="button"
        class="mt-5 block w-full text-center text-sm text-slate-700 hover:underline"
        @click="mode = 'password'"
      >
        Use password instead
      </button>
    </template>

    <template v-else>
      <h1 class="mb-4 text-base font-semibold text-slate-900">Sign in</h1>
      <AuthLoginForm @success="onSuccess" />
      <button
        v-if="isEnabled"
        type="button"
        class="mt-4 block w-full text-center text-sm text-slate-700 hover:underline"
        @click="mode = 'pin'"
      >
        Use PIN instead
      </button>
    </template>
  </div>
</template>
