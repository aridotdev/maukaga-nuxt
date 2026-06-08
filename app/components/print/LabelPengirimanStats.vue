<script setup lang="ts">
type LabelPengirimanSummary = {
  totalItems: number
  totalGroups: number
  belumDikirim: number
  dikirim: number
}

const props = defineProps<{
  summary?: Partial<LabelPengirimanSummary>
  selectedCount?: number
  loading?: boolean
}>()

const normalizedSummary = computed(() => ({
  totalItems: Number(props.summary?.totalItems || 0),
  totalGroups: Number(props.summary?.totalGroups || 0),
  belumDikirim: Number(props.summary?.belumDikirim || 0),
  dikirim: Number(props.summary?.dikirim || 0)
}))

const stats = computed(() => [{
  title: 'Total Item Printed',
  icon: 'i-lucide-package-check',
  value: normalizedSummary.value.totalItems,
  description: `${normalizedSummary.value.totalGroups} group cabang+nama`
}, {
  title: 'Total Group',
  icon: 'i-lucide-tags',
  value: normalizedSummary.value.totalGroups,
  description: `${Number(props.selectedCount || 0)} item dipilih`
}, {
  title: 'Belum Dikirim',
  icon: 'i-lucide-truck',
  value: normalizedSummary.value.belumDikirim,
  description: 'Siap ditandai Dikirim'
}, {
  title: 'Dikirim',
  icon: 'i-lucide-circle-check',
  value: normalizedSummary.value.dikirim,
  description: 'Sudah terkirim'
}])
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase',
        description: 'text-xs text-muted'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-end justify-between gap-3">
        <span class="text-2xl font-semibold text-highlighted">
          {{ loading ? '...' : stat.value }}
        </span>
        <span class="text-xs text-muted">
          {{ stat.description }}
        </span>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
