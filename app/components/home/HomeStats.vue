<script setup lang="ts">

type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type DashboardSummary = {
  total?: number
  baru?: number
  disetujui?: number
  ditolak?: number
  selesai?: number
}

type DashboardResponse = {
  summary?: DashboardSummary
}

const runtimeConfig = useRuntimeConfig()
const router = useRouter()
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))
const summary = ref<DashboardSummary>({})

const stats = computed(() => [{
  title: 'Total Pengajuan',
  icon: 'i-lucide-files',
  value: Number(summary.value.total || 0),
}, {
  title: 'Pengajuan Baru',
  icon: 'i-lucide-file-plus',
  value: Number(summary.value.baru || 0),
}, {
  title: 'Disetujui (Siap Cetak)',
  icon: 'i-lucide-circle-check',
  value: Number(summary.value.disetujui || 0),
}, {
  title: 'Ditolak',
  icon: 'i-lucide-x-circle',
  value: Number(summary.value.ditolak || 0),
}])

onMounted(() => {
  loadDashboardSummary()
})

async function loadDashboardSummary() {
  try {
    summary.value = await fetchDashboardSummary()
  } catch (error) {
    const message = getErrorMessage(error)
    summary.value = {}

    if (message === 'Unauthorized') {
      sessionStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin_nama')
      sessionStorage.removeItem('admin_username')
      await router.push('/login')
    }
  }
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (!appsScriptApiUrl.value) throw new Error('URL Google Apps Script belum dikonfigurasi.')

  const token = sessionStorage.getItem('admin_token')
  if (!token) throw new Error('Token admin tidak ditemukan. Login dashboard terlebih dahulu.')

  const response = await fetch(appsScriptApiUrl.value, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'getDashboard',
      token,
      page: 1,
      pageSize: 20
    })
  })

  if (!response.ok) throw new Error(`Google Apps Script merespons ${response.status}.`)

  const result = await response.json() as ApiResult<DashboardResponse>
  if (!result.success) throw new Error(result.error || 'Gagal memuat dashboard')

  return result.data?.summary || {}
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

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
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
