<script setup lang="ts">
const { isEnabled, enablePin, disablePin } = usePin()

const setting = ref(false)
const step = ref<'enter' | 'confirm'>('enter')
const firstPin = ref('')
const error = ref('')
const loading = ref(false)

function reset() {
  setting.value = false
  step.value = 'enter'
  firstPin.value = ''
  error.value = ''
}

function onEnter(pin: string) {
  firstPin.value = pin
  error.value = ''
  step.value = 'confirm'
}

async function onConfirm(pin: string) {
  if (pin !== firstPin.value) {
    error.value = 'PINs do not match. Start again.'
    firstPin.value = ''
    step.value = 'enter'
    return
  }
  loading.value = true
  try {
    await enablePin(firstPin.value)
    reset()
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not set PIN.'
    step.value = 'enter'
    firstPin.value = ''
  }
  finally {
    loading.value = false
  }
}

async function onDisable() {
  loading.value = true
  try {
    await disablePin()
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md">
    <h1 class="text-xl font-semibold text-slate-900">Security</h1>

    <div class="mt-6 rounded-lg border border-slate-200 bg-white p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-sm font-medium text-slate-900">PIN quick sign in</h2>
          <p class="mt-1 text-sm text-slate-500">
            Sign back in on this device with a numeric PIN. It's per-device; too many wrong
            attempts falls back to your password.
          </p>
        </div>
        <Tag :value="isEnabled ? 'Enabled' : 'Disabled'" :severity="isEnabled ? 'success' : 'secondary'" />
      </div>

      <div class="mt-5">
        <Button
          v-if="isEnabled"
          label="Disable PIN"
          severity="secondary"
          outlined
          :loading="loading"
          @click="onDisable"
        />

        <Button
          v-else-if="!setting"
          label="Set up PIN"
          :loading="loading"
          @click="setting = true"
        />

        <div v-else>
          <p class="mb-3 text-sm text-slate-600">
            {{ step === 'enter' ? 'Choose a 6-digit PIN' : 'Re-enter your PIN to confirm' }}
          </p>
          <AuthPinPad
            :key="step"
            :loading="loading"
            @complete="step === 'enter' ? onEnter($event) : onConfirm($event)"
          />
          <Message v-if="error" severity="error" :closable="false" size="small" class="mt-3">
            {{ error }}
          </Message>
          <Button label="Cancel" text class="mt-3" :disabled="loading" @click="reset" />
        </div>
      </div>
    </div>
  </div>
</template>
