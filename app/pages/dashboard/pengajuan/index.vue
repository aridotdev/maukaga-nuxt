<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type DashboardStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'

type DashboardPengajuanRow = {
  nomor: number
  idPengajuan: string
  timestampSubmit: string
  nama: string
  bagianCabang: string
  jumlahItem: number | string
  status: DashboardStatus
}

type DashboardResponse = {
  rows: DashboardPengajuanRow[]
  totalRows: number
  page: number
  pageSize: number
}

const runtimeConfig = useRuntimeConfig()
const router = useRouter()
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))
const dashboard = ref<DashboardResponse>(createEmptyDashboardResponse())
const isLoading = ref(false)
const loadError = ref('')
const globalFilter = ref('')
const statusFilter = ref<'all' | DashboardStatus>('all')

const statusFilterItems = [{
  label: 'All',
  value: 'all'
}, {
  label: 'Baru',
  value: 'Baru'
}, {
  label: 'Disetujui',
  value: 'Disetujui'
}, {
  label: 'Ditolak',
  value: 'Ditolak'
}, {
  label: 'Selesai',
  value: 'Selesai'
}]

const columns: TableColumn<DashboardPengajuanRow>[] = [{
  accessorKey: 'nomor',
  header: 'No',
  meta: {
    class: {
      th: 'w-14',
      td: 'w-14'
    }
  },
  cell: ({ row }) => h('span', { class: 'font-medium text-muted' }, row.original.nomor)
}, {
  accessorKey: 'idPengajuan',
  header: 'ID Pengajuan',
  meta: {
    class: {
      th: 'w-[18%]',
      td: 'w-[18%]'
    }
  },
  cell: ({ row }) => h('span', { class: 'font-mono text-sm font-semibold text-highlighted' }, row.original.idPengajuan)
}, {
  accessorKey: 'timestampSubmit',
  header: 'Waktu Submit',
  meta: {
    class: {
      th: 'w-[17%]',
      td: 'w-[17%]'
    }
  },
  cell: ({ row }) => h('span', { class: 'text-muted' }, formatSubmitTime(row.original.timestampSubmit))
}, {
  accessorKey: 'nama',
  header: 'Nama & Cabang',
  meta: {
    class: {
      th: 'w-[27%]',
      td: 'w-[27%]'
    }
  },
  cell: ({ row }) => h('div', { class: 'min-w-0' }, [
    h('p', { class: 'truncate font-semibold text-highlighted' }, row.original.nama || '-'),
    h('p', { class: 'truncate text-xs text-muted' }, row.original.bagianCabang || '-')
  ])
}, {
  accessorKey: 'jumlahItem',
  header: () => h('div', { class: 'text-center' }, 'Jml Item'),
  meta: {
    class: {
      th: 'w-[10%]',
      td: 'w-[10%]'
    }
  },
  cell: ({ row }) => h('div', { class: 'text-center font-medium text-toned' }, row.original.jumlahItem || 0)
}, {
  accessorKey: 'status',
  header: 'Status',
  meta: {
    class: {
      th: 'w-[14%]',
      td: 'w-[14%]'
    }
  },
  cell: ({ row }) =>
    h(UBadge, {
      color: getStatusColor(row.original.status),
      variant: 'subtle',
      label: row.original.status,
      class: 'font-semibold'
    })
}, {
  id: 'actions',
  header: () => h('div', { class: 'text-right' }, 'Aksi'),
  meta: {
    class: {
      th: 'w-[14%]',
      td: 'w-[14%]'
    }
  },
  cell: ({ row }) =>
    h('div', { class: 'flex justify-end' }, [
      h(UButton, {
        label: 'Detail',
        icon: 'i-lucide-eye',
        color: 'neutral',
        variant: 'soft',
        size: 'sm',
        onClick: () => showDetail(row.original)
      })
    ])
}]

const latestRows = computed(() => {
  const keyword = globalFilter.value.trim().toLowerCase()

  return [...(dashboard.value?.rows || [])]
    .filter((row) => statusFilter.value === 'all' || row.status === statusFilter.value)
    .filter((row) => {
      if (!keyword) return true

      return [
        row.idPengajuan,
        row.timestampSubmit,
        row.nama,
        row.bagianCabang,
        row.jumlahItem,
        row.status
      ].some((value) => String(value || '').toLowerCase().includes(keyword))
    })
    .sort((a, b) => getTime(b.timestampSubmit) - getTime(a.timestampSubmit))
    .slice(0, 10)
    .map((row, index) => ({ ...row, nomor: index + 1 }))
})

onMounted(() => {
  refresh()
})

async function refresh() {
  isLoading.value = true
  loadError.value = ''

  try {
    dashboard.value = await fetchLatestPengajuan()
  } catch (error) {
    const message = getErrorMessage(error)
    dashboard.value = createEmptyDashboardResponse()
    loadError.value = message

    if (message === 'Unauthorized') {
      sessionStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin_nama')
      sessionStorage.removeItem('admin_username')
      await router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

async function fetchLatestPengajuan(): Promise<DashboardResponse> {
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
      pageSize: 10
    })
  })

  if (!response.ok) throw new Error(`Google Apps Script merespons ${response.status}.`)

  const result = await response.json() as ApiResult<DashboardResponse>
  if (!result.success) throw new Error(result.error || 'Data pengajuan gagal dimuat.')

  const rows = (result.data?.rows || []).map((row, index) => ({
    ...row,
    nomor: index + 1
  }))

  return {
    rows,
    totalRows: Number(result.data?.totalRows || rows.length),
    page: Number(result.data?.page || 1),
    pageSize: Number(result.data?.pageSize || 10)
  }
}

function createEmptyDashboardResponse(): DashboardResponse {
  return {
    rows: [],
    totalRows: 0,
    page: 1,
    pageSize: 10
  }
}

function getTime(value: string) {
  const time = new Date(value || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatSubmitTime(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function getStatusColor(status: DashboardStatus) {
  const colors = {
    Baru: 'info',
    Disetujui: 'success',
    Ditolak: 'error',
    Selesai: 'neutral'
  } as const

  return colors[status] || 'neutral'
}

async function showDetail(row: DashboardPengajuanRow) {
  if (!row.idPengajuan) return

  const url = router.resolve(`/dashboard/pengajuan/${encodeURIComponent(row.idPengajuan)}`).href
  window.open(url, '_blank')
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <UDashboardPanel id="pengajuan">
    <template #header>
      <UDashboardNavbar title="Pengajuan Kartu Garansi" description="Daftar pengajuan admin">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <section class="relative rounded-lg border border-muted bg-default/45 shadow-sm backdrop-blur-xl">

        <div class="min-h-0 w-full overflow-x-auto">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-accented px-4 py-3.5">
            <UInput
              v-model="globalFilter"
              class="w-full max-w-sm"
              icon="i-lucide-search"
              placeholder="Global filter..."
            />

            <USelect
              v-model="statusFilter"
              :items="statusFilterItems"
              class="w-full sm:w-40"
              :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            />
          </div>

          <UTable
            :data="latestRows"
            :columns="columns"
            :loading="isLoading"
            class="w-full"
            :ui="{
              root: 'w-full',
              base: 'w-full min-w-190 table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-elevated/45 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              tr: 'transition-colors hover:bg-elevated/30',
              th: 'border-b border-muted px-4 py-3 text-xs font-semibold uppercase text-muted',
              td: 'border-b border-muted px-4 py-4 text-sm align-middle',
              separator: 'h-0'
            }"
          >
            <template #empty>
              <div class="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <UIcon
                  :name="loadError ? 'i-lucide-circle-alert' : 'i-lucide-inbox'"
                  class="size-8 text-muted"
                />
                <p class="text-sm font-medium text-highlighted">
                  {{ loadError ? 'Data pengajuan belum bisa dimuat' : 'Belum ada pengajuan final' }}
                </p>
                <p v-if="loadError" class="max-w-md text-sm text-muted">
                  {{ loadError }}
                </p>
              </div>
            </template>
          </UTable>
        </div>
      </section>
    </template>
  </UDashboardPanel>
</template>
