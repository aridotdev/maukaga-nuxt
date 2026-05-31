<script setup lang="ts">

const stats = [{
  title: 'Total Pengajuan',
  icon: 'i-lucide-files',
  value: 400,
  variation: 12
}, {
  title: 'Pengajuan Baru',
  icon: 'i-lucide-file-plus',
  value: 25,
  variation: 10
}, {
  title: 'Disetujui (Siap Cetak)',
  icon: 'i-lucide-circle-check',
  value: 35,
  variation: 25,
}, {
  title: 'Ditolak',
  icon: 'i-lucide-x-circle',
  value: 10,
  variation: -5
}]

</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      to="/customers"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
