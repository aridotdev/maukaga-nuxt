<script setup lang="ts">
const router = useRouter()

const { summary, rows, isLoading, error, ensureLoaded } = useDashboardData()

const totalItems = computed(() => {
  if (summary.value.totalItems !== undefined) return Number(summary.value.totalItems || 0)
  return rows.value.reduce((total, row) => total + Number(row.jumlahItem || 0), 0)
})

const approvedItems = computed(() => {
  if (summary.value.itemDisetujui !== undefined) return Number(summary.value.itemDisetujui || 0)
  return rows.value
    .filter((row) => row.status === 'Disetujui')
    .reduce((total, row) => total + Number(row.jumlahItem || 0), 0)
})

const rejectedItems = computed(() => {
  if (summary.value.itemDitolak !== undefined) return Number(summary.value.itemDitolak || 0)
  return rows.value
    .filter((row) => row.status === 'Ditolak')
    .reduce((total, row) => total + Number(row.jumlahItem || 0), 0)
})

const stats = computed(() => [{
  title: 'Total Pengajuan',
  icon: 'i-lucide-files',
  value: Number(summary.value.total || 0)
}, {
  title: 'Total Item',
  icon: 'i-lucide-boxes',
  value: totalItems.value
}, {
  title: 'Pengajuan Baru',
  icon: 'i-lucide-file-plus',
  value: Number(summary.value.baru || 0)
}, {
  title: 'Disetujui (Siap Cetak)',
  icon: 'i-lucide-circle-check',
  value: approvedItems.value
}, {
  title: 'Ditolak',
  icon: 'i-lucide-x-circle',
  value: rejectedItems.value
}])

const showSkeleton = computed(() => isLoading.value && !summary.value.total && !summary.value.totalItems)

onMounted(() => {
  ensureLoaded()
})

// Pantau perubahan error untuk handle 401.
watch(error, async (msg) => {
  if (msg && (msg.includes('Unauthorized') || msg.includes('Token admin'))) {
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_nama')
    sessionStorage.removeItem('admin_username')
    await router.push('/login')
  }
})
</script>

<template>
  <UPageGrid class="lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-px">
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
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <USkeleton v-if="showSkeleton" class="h-7 w-16" />
        <span v-else class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
