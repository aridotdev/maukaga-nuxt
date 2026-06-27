<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type Table } from '@tanstack/table-core'

definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

type DashboardStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Diterima' | 'Selesai'
type DashboardItemStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'
type DashboardItemDecision = 'Disetujui' | 'Ditolak' | ''

type DashboardPengajuanSourceRow = {
  idPengajuan: string
  timestampSubmit: string
  nama: string
  bagianCabang: string
  jumlahItem: number | string
  status: DashboardStatus | string
  itemStatuses?: Array<{
    noItem: number | string
    status: DashboardItemStatus | string
    keputusanItem?: DashboardItemDecision | string
  }>
}

type DashboardPengajuanRow = {
  key: string
  nomor?: number
  idPengajuan: string
  noItem: number | string
  timestampSubmit: string
  nama: string
  bagianCabang: string
  jumlahItem: number | string
  status: DashboardItemStatus | string
  keputusanItem: DashboardItemDecision | string
  pengajuanStatus: DashboardStatus | string
}

type PengajuanTableRef = {
  tableApi?: Table<DashboardPengajuanRow>
}

const router = useRouter()
const {
  rows,
  isLoading,
  isRefreshing,
  error,
  ensureLoaded,
  loadedRows,
  totalRows,
  isFullyLoaded
} = useDashboardData({ loadAll: true })
const loadError = computed(() => error.value || '')

const globalFilter = ref('')
const statusFilter = ref<'all' | DashboardItemStatus>('all')
const pengajuanTable = useTemplateRef<PengajuanTableRef>('pengajuanTable')
const pengajuanPagination = ref({
  pageIndex: 0,
  pageSize: 15
})

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

const pengajuanTableGlobalFilterOptions = {
  globalFilterFn: (row: { original: DashboardPengajuanRow }, _columnId: string, filterValue: unknown) => {
    const keyword = String(filterValue || '').trim().toLowerCase()
    if (!keyword) return true
    return [
      row.original.idPengajuan,
      row.original.timestampSubmit,
      row.original.nama,
      row.original.bagianCabang,
      row.original.jumlahItem,
      row.original.status,
      row.original.keputusanItem,
      row.original.pengajuanStatus
    ].some((value) => String(value || '').toLowerCase().includes(keyword))
  }
}

// Filter + search di sisi FE.
// Setelah filter, baris di-"explode" per item (sesuai `jumlahItem`)
// sehingga setiap noItem 1..N tampil sebagai baris sendiri.
const filteredRows = computed<DashboardPengajuanSourceRow[]>(() => {
  const keyword = globalFilter.value.trim().toLowerCase()
  const source = rows.value as DashboardPengajuanSourceRow[]

  return [...source]
    .filter((row) => {
      if (!keyword) return true
      return [
        row.idPengajuan,
        row.timestampSubmit,
        row.nama,
        row.bagianCabang,
        row.jumlahItem,
        row.status,
        ...getItemStatuses(row).flatMap(item => [item.status, item.keputusanItem])
      ].some((value) => String(value || '').toLowerCase().includes(keyword))
    })
    .sort((a, b) => getTime(b.timestampSubmit) - getTime(a.timestampSubmit))
})

const explodedRows = computed<DashboardPengajuanRow[]>(() => {
  const out: DashboardPengajuanRow[] = []
  filteredRows.value.forEach((parent) => {
    for (const itemStatus of getItemStatuses(parent)) {
      out.push({
        key: getRowKey(parent.idPengajuan, itemStatus.noItem),
        idPengajuan: parent.idPengajuan,
        noItem: itemStatus.noItem,
        timestampSubmit: parent.timestampSubmit,
        nama: parent.nama,
        bagianCabang: parent.bagianCabang,
        jumlahItem: parent.jumlahItem,
        status: itemStatus.status,
        keputusanItem: itemStatus.keputusanItem,
        pengajuanStatus: parent.status
      })
    }
  })
  return out.filter((row) => matchesStatusFilter(row, statusFilter.value))
})

const filteredPengajuanCount = computed(() => new Set(explodedRows.value.map(row => row.idPengajuan)).size)

// Tabel di-pause saat loading awal agar skeleton loading tampil utuh.
const tableRows = computed<DashboardPengajuanRow[]>(() => isLoading.value ? [] : explodedRows.value)

const pengajuanPaginationTotal = computed<number>(() =>
  pengajuanTable.value?.tableApi?.getFilteredRowModel().rows.length || 0
)
const pengajuanCurrentPage = computed<number>(() =>
  (pengajuanTable.value?.tableApi?.getState().pagination.pageIndex ?? pengajuanPagination.value.pageIndex) + 1
)
const pengajuanItemsPerPage = computed<number>(() =>
  pengajuanTable.value?.tableApi?.getState().pagination.pageSize || pengajuanPagination.value.pageSize
)

const columns: TableColumn<DashboardPengajuanRow>[] = [{
  accessorKey: 'idPengajuan',
  header: 'ID Pengajuan',
  meta: { class: { th: 'w-[18%]', td: 'w-[18%]' } },
  cell: ({ row }) => h('span', { class: 'font-mono text-sm font-semibold' }, row.original.idPengajuan)
}, {
  accessorKey: 'noItem',
  header: 'Item',
  meta: { class: { th: 'w-20', td: 'w-20' } },
  cell: ({ row }) => h('p', { class: 'text-sm font-medium text-toned' }, `Item #${row.original.noItem}`)
}, {
  accessorKey: 'timestampSubmit',
  header: 'Waktu Submit',
  meta: { class: { th: 'w-[17%]', td: 'w-[17%]' } },
  cell: ({ row }) => h('span', { class: '' }, formatSubmitTime(row.original.timestampSubmit))
}, {
  accessorKey: 'nama',
  header: 'Nama',
  meta: { class: { th: 'w-[24%]', td: 'w-[24%]' } },
  cell: ({ row }) => h('div', { class: 'min-w-0' }, [
    h('p', { class: 'text-muted font-semibold' }, row.original.nama || '-')
  ])
}, {
  accessorKey: 'bagianCabang',
  header: 'Cabang',
  meta: { class: { th: 'w-[24%]', td: 'w-[24%]' } },
  cell: ({ row }) => h('div', { class: 'min-w-0' }, [
    h('p', { class: 'uppercase' }, row.original.bagianCabang || '-')
  ])
}, {
  accessorKey: 'status',
  header: 'Status',
  meta: { class: { th: 'w-[14%]', td: 'w-[14%]' } },
  cell: ({ row }) => h('div', { class: 'flex flex-col items-start gap-1' }, [
    h(UBadge, {
      color: getStatusColor(row.original.status),
      variant: 'subtle',
      label: row.original.status,
      class: 'font-semibold'
    }),
    row.original.keputusanItem && row.original.keputusanItem !== row.original.status
      ? h(UBadge, {
          color: getStatusColor(row.original.keputusanItem),
          variant: 'outline',
          label: `Keputusan: ${row.original.keputusanItem}`,
          class: 'font-medium'
        })
      : null
  ])
}, {
  id: 'actions',
  header: () => h('div', { class: 'text-right' }, 'Aksi'),
  meta: { class: { th: 'w-[14%]', td: 'w-[14%]' } },
  cell: ({ row }) => h('div', { class: 'flex justify-end' }, [
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

onMounted(() => {
  ensureLoaded()
})

watch(error, async (msg) => {
  if (msg && (msg.includes('Unauthorized') || msg.includes('Token admin'))) {
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_nama')
    sessionStorage.removeItem('admin_username')
    await router.push('/login')
  }
})

watch(globalFilter, () => {
  pengajuanTable.value?.tableApi?.setPageIndex(0)
})
watch(statusFilter, () => {
  pengajuanTable.value?.tableApi?.setPageIndex(0)
})

function setPengajuanPage(page: number) {
  pengajuanTable.value?.tableApi?.setPageIndex(page - 1)
}

function showDetail(row: DashboardPengajuanRow) {
  if (!row.idPengajuan) return
  const url = router.resolve(`/dashboard/pengajuan/${encodeURIComponent(row.idPengajuan)}`).href
  window.open(url, '_blank')
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

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    Baru: 'info',
    Disetujui: 'success',
    Ditolak: 'error',
    Diprint: 'warning',
    Dikirim: 'primary',
    Diterima: 'secondary',
    Selesai: 'neutral'
  }
  return colors[status] || 'neutral'
}

function matchesStatusFilter(row: DashboardPengajuanRow, filter: 'all' | DashboardItemStatus) {
  if (filter === 'all') return true
  if (filter === 'Disetujui' || filter === 'Ditolak') {
    return row.keputusanItem === filter || row.status === filter
  }
  return row.status === filter
}

function getItemStatuses(row: DashboardPengajuanSourceRow) {
  const statuses = row.itemStatuses || []
  if (statuses.length) {
    return [...statuses]
      .map((item, index) => ({
        noItem: item.noItem || index + 1,
        status: normalizeItemStatus(item.status, row.status),
        keputusanItem: normalizeItemDecision(item.keputusanItem, item.status, row.status)
      }))
      .sort((a, b) => Number(a.noItem) - Number(b.noItem))
  }

  const total = clampItemCount(row.jumlahItem)
  return Array.from({ length: total }, (_, index) => ({
    noItem: index + 1,
    status: normalizeItemStatus('', row.status),
    keputusanItem: normalizeItemDecision('', '', row.status)
  }))
}

function normalizeItemStatus(status: string, fallbackStatus: string): DashboardItemStatus {
  const value = String(status || fallbackStatus || '').trim()
  if (value === 'Disetujui' || value === 'Ditolak' || value === 'Selesai') return value
  return 'Baru'
}

function normalizeItemDecision(decision: string | undefined, status: string, fallbackStatus: string): DashboardItemDecision {
  const value = String(decision || '').trim()
  if (value === 'Disetujui' || value === 'Ditolak') return value

  const itemStatus = String(status || '').trim()
  if (itemStatus === 'Ditolak') return 'Ditolak'
  if (itemStatus === 'Disetujui' || itemStatus === 'Selesai') return 'Disetujui'

  const parentStatus = String(fallbackStatus || '').trim()
  if (parentStatus === 'Ditolak') return 'Ditolak'
  if (['Disetujui', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'].includes(parentStatus)) return 'Disetujui'

  return ''
}

function clampItemCount(value: number | string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.min(Math.floor(n), 999)
}

function getRowKey(idPengajuan: string, noItem: number | string) {
  return `${idPengajuan}::${noItem}`
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

            <div class="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
              <p
                v-if="isRefreshing && totalRows"
                class="text-xs text-muted"
                aria-live="polite"
              >
                Memuat {{ loadedRows }} dari {{ totalRows }} pengajuan...
              </p>
              <p
                v-else-if="!isFullyLoaded && totalRows"
                class="text-xs text-muted"
                aria-live="polite"
              >
                {{ loadedRows }} dari {{ totalRows }} pengajuan dimuat.
              </p>

              <USelect
                v-model="statusFilter"
                :items="statusFilterItems"
                class="w-full sm:w-40"
                :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
              />
            </div>
          </div>

          <UTable
            ref="pengajuanTable"
            v-model:pagination="pengajuanPagination"
            v-model:global-filter="globalFilter"
            :get-row-id="(row) => row.key"
            :data="tableRows"
            :columns="columns"
            :global-filter-options="pengajuanTableGlobalFilterOptions"
            :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
            :loading="isLoading"
            loading-color="primary"
            loading-animation="carousel"
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
            <template #loading>
              <div
                class="flex flex-col items-center justify-center gap-2 py-8 text-center text-primary"
                role="status"
                aria-live="polite"
              >
                <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
                <p class="text-sm font-medium">
                  Loading ...
                </p>
              </div>
            </template>

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

          <div v-if="!isLoading && explodedRows.length" class="flex flex-wrap items-center justify-between gap-3 border-t border-accented px-4 py-3">
            <p class="text-xs text-muted">
              {{ explodedRows.length }} item dari {{ filteredPengajuanCount }} pengajuan.
            </p>
            <UPagination
              :page="pengajuanCurrentPage"
              :items-per-page="pengajuanItemsPerPage"
              :total="pengajuanPaginationTotal"
              @update:page="setPengajuanPage"
            />
          </div>
        </div>
      </section>
    </template>
  </UDashboardPanel>
</template>
