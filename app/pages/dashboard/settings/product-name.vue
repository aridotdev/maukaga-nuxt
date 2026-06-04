<script setup lang="ts">
import UnderConstruction from '~/components/UnderConstruction.vue';
definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})
</script>

<template>
  <UnderConstruction />
</template>
