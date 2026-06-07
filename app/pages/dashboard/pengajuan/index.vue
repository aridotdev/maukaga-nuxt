<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

type DashboardStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'

type DashboardPengajuanRow = {
  nomor?: number
  idPengajuan: string
  timestampSubmit: string
  nama: string
  bagianCabang: string
  jumlahItem: number | string
  status: DashboardStatus | string
}

const router = useRouter()
const { rows, isLoading, error, ensureLoaded } = useDashboardData()
const loadError = computed(() => error.value || '')

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
  meta: { class: { th: 'w-14', td: 'w-14' } },
  cell: ({ row }) => h('span', { class: 'font-medium text-muted' }, row.original.nomor)
}, {
  accessorKey: 'idPengajuan',
  header: 'ID Pengajuan',
  meta: { class: { th: 'w-[18%]', td: 'w-[18%]' } },
  cell: ({ row }) => h('span', { class: 'font-mono text-sm font-semibold text-highlighted' }, row.original.idPengajuan)
}, {
  accessorKey: 'timestampSubmit',
  header: 'Waktu Submit',
  meta: { class: { th: 'w-[17%]', td: 'w-[17%]' } },
  cell: ({ row }) => h('span', { class: 'text-muted' }, formatSubmitTime(row.original.timestampSubmit))
}, {
  accessorKey: 'nama',
  header: 'Nama & Cabang',
  meta: { class: { th: 'w-[27%]', td: 'w-[27%]' } },
  cell: ({ row }) => h('div', { class: 'min-w-0' }, [
    h('p', { class: 'truncate font-semibold text-highlighted' }, row.original.nama || '-'),
    h('p', { class: 'truncate text-xs text-muted' }, row.original.bagianCabang || '-')
  ])
}, {
  accessorKey: 'jumlahItem',
  header: () => h('div', { class: 'text-center' }, 'Jml Item'),
  meta: { class: { th: 'w-[10%]', td: 'w-[10%]' } },
  cell: ({ row }) => h('div', { class: 'text-center font-medium text-toned' }, row.original.jumlahItem || 0)
}, {
  accessorKey: 'status',
  header: 'Status',
  meta: { class: { th: 'w-[14%]', td: 'w-[14%]' } },
  cell: ({ row }) => h(UBadge, {
    color: getStatusColor(row.original.status),
    variant: 'subtle',
    label: row.original.status,
    class: 'font-semibold'
  })
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

const latestRows = computed<DashboardPengajuanRow[]>(() => {
  const keyword = globalFilter.value.trim().toLowerCase()

  return [...rows.value]
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
    .map((row, index) => ({ ...row, nomor: index + 1 }))
})

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
    Selesai: 'neutral'
  }
  return colors[status] || 'neutral'
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
