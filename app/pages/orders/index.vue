<script setup lang="ts">
// Orders are accessed through a customer now (create/view from the customer page),
// so the standalone orders list redirects there. Order detail (`/orders/[id]`) stays.
await navigateTo('/customers', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
