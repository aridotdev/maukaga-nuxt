<script setup lang="ts">
import UnderConstruction from '~/components/UnderConstruction.vue';

</script>

<template>
  <UDashboardPanel id="ReviewProductName">
    <template #header>
      <UDashboardNavbar title="Product Name List">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <CustomersAddModal />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UnderConstruction />
    </template>
  </UDashboardPanel>
</template>
