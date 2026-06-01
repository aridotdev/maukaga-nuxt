<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')

const VALID_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Selesai'] as const

type PengajuanStatus = typeof VALID_STATUSES[number]

type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type DetailItem = {
  noItem?: number | string
  produk?: string
  model?: string
  nomorSeri?: string
  modelNormalized?: string
  produkStatus?: string
  produkSumber?: string
}

type RiwayatStatus = {
  timestamp?: string
  statusLama?: string
  statusBaru?: string
  catatanAdmin?: string
  user?: string
}

type DetailPengajuan = {
  idPengajuan: string
  timestampSubmit?: string
  nama?: string
  bagianCabang?: string
  pemilik?: string
  alasanPengajuan?: string
  tanggalForm?: string
  fileHardCopyUrl?: string
  fileHardCopyId?: string
  catatanTambahan?: string
  jumlahItem?: number | string
  status: PengajuanStatus
  catatanAdmin?: string
  tanggalUpdateStatusTerakhir?: string
  userUpdateStatus?: string
  riwayatSingkat?: string
  items?: DetailItem[]
  riwayat?: RiwayatStatus[]
}

type InfoField = {
  label: string
  value: string
  href?: string
  mono?: boolean
}

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const toast = useToast()

const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))
const idPengajuan = computed(() => normalizeRouteParam(route.params.idPengajuan))
const detail = ref<DetailPengajuan | null>(null)
const isLoading = ref(false)
const isSubmitting = ref(false)
const loadError = ref('')
const statusError = ref('')
const statusNotice = ref('')
const formState = reactive({
  statusBaru: 'Baru' as PengajuanStatus,
  catatanAdmin: ''
})

const statusItems = VALID_STATUSES.map((status) => ({
  label: status,
  value: status
}))

const hasUnverifiedItems = computed(() => {
  return (detail.value?.items || []).some((item) => !isProductVerified(item.produkStatus))
})

const transitionWarning = computed(() => {
  if (!detail.value || !formState.statusBaru || formState.statusBaru === detail.value.status) return ''

  if (detail.value.status === 'Baru' && formState.statusBaru === 'Disetujui' && hasUnverifiedItems.value) {
    return 'Ada item dengan Nama Produk belum terverifikasi. Pengajuan tetap bisa disetujui, tetapi item tersebut belum masuk antrean cetak sampai diverifikasi.'
  }

  if (detail.value.status === 'Disetujui' && formState.statusBaru === 'Selesai') {
    return 'Tandai pengajuan ini sebagai Selesai? Pastikan proses kartu garansi sudah selesai.'
  }

  if (detail.value.status === 'Disetujui' && formState.statusBaru === 'Ditolak') {
    return 'Pengajuan ini sudah disetujui. Yakin ingin mengubahnya menjadi Ditolak?'
  }

  if (detail.value.status === 'Ditolak' && formState.statusBaru === 'Disetujui') {
    return 'Pengajuan ini sebelumnya ditolak. Yakin ingin menyetujuinya?'
  }

  if (detail.value.status === 'Selesai') {
    return 'Pengajuan ini sudah Selesai. Yakin ingin membuka ulang statusnya?'
  }

  return ''
})

const infoFields = computed<InfoField[]>(() => {
  if (!detail.value) return []

  return [{
    label: 'Nama',
    value: detail.value.nama || '-'
  }, {
    label: 'Bagian/Cabang',
    value: detail.value.bagianCabang || '-'
  }, {
    label: 'Pemilik',
    value: detail.value.pemilik || '-'
  }, {
    label: 'Alasan Pengajuan',
    value: detail.value.alasanPengajuan || '-'
  }, {
    label: 'Catatan Tambahan',
    value: detail.value.catatanTambahan || '-'
  }]
})

const itemColumns: TableColumn<DetailItem>[] = [{
  accessorKey: 'noItem',
  header: 'No Item',
  cell: ({ row }) => h('span', { class: 'font-medium text-muted' }, row.original.noItem || '-')
}, {
  accessorKey: 'produk',
  header: 'Produk',
  cell: ({ row }) => h('span', { class: 'font-semibold text-highlighted' }, row.original.produk || '-')
}, {
  accessorKey: 'model',
  header: 'Model',
  cell: ({ row }) => h('span', { class: 'text-toned' }, row.original.model || '-')
}, {
  accessorKey: 'nomorSeri',
  header: 'Nomor Seri',
  cell: ({ row }) => h('span', { class: 'font-mono text-sm text-toned' }, row.original.nomorSeri || '-')
}, {
  accessorKey: 'produkStatus',
  header: 'Status Produk',
  cell: ({ row }) => h(UBadge, {
    color: isProductVerified(row.original.produkStatus) ? 'success' : 'warning',
    variant: 'subtle',
    label: isProductVerified(row.original.produkStatus) ? 'Verified' : 'Belum Verified',
    class: 'font-semibold'
  })
}]

const historyColumns: TableColumn<RiwayatStatus>[] = [{
  accessorKey: 'timestamp',
  header: 'Waktu',
  cell: ({ row }) => h('span', { class: 'text-muted' }, formatDateTime(row.original.timestamp))
}, {
  id: 'transition',
  header: 'Status Lama → Baru',
  cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, `${row.original.statusLama || '-'} → ${row.original.statusBaru || '-'}`)
}, {
  accessorKey: 'catatanAdmin',
  header: 'Catatan',
  cell: ({ row }) => h('span', { class: 'text-toned' }, row.original.catatanAdmin || '-')
}, {
  accessorKey: 'user',
  header: 'Admin',
  cell: ({ row }) => h('span', { class: 'text-toned' }, row.original.user || '-')
}]

onMounted(() => {
  loadDetail()
})

async function loadDetail() {
  isLoading.value = true
  loadError.value = ''
  statusError.value = ''
  statusNotice.value = ''

  try {
    if (!idPengajuan.value) throw new Error('ID Pengajuan tidak valid.')

    const result = await callAdminApi<DetailPengajuan>('getDetail', {
      idPengajuan: idPengajuan.value
    })

    if (!result.data) throw new Error('Pengajuan tidak ditemukan')

    detail.value = result.data
    formState.statusBaru = result.data.status || 'Baru'
    formState.catatanAdmin = result.data.catatanAdmin || ''
  } catch (error) {
    const message = getErrorMessage(error)
    detail.value = null
    loadError.value = message

    if (isUnauthorizedMessage(message)) {
      clearAdminSession()
      await router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

async function submitStatus() {
  statusError.value = ''
  statusNotice.value = ''

  if (!detail.value) return

  const statusBaru = formState.statusBaru
  const catatanAdmin = formState.catatanAdmin.trim()

  if (!isValidStatus(statusBaru)) {
    statusError.value = 'Status tidak valid.'
    return
  }

  if (statusBaru === detail.value.status) {
    statusNotice.value = 'Tidak ada perubahan status untuk disimpan.'
    return
  }

  if (statusBaru === 'Ditolak' && !catatanAdmin) {
    statusError.value = 'Catatan Admin wajib diisi jika status Ditolak.'
    return
  }

  const confirmMessage = getTransitionConfirmMessage(detail.value.status, statusBaru)
  if (confirmMessage && !window.confirm(confirmMessage)) return

  isSubmitting.value = true

  try {
    await callAdminApi<Record<string, never>>('updateStatus', {
      idPengajuan: detail.value.idPengajuan,
      statusBaru,
      catatanAdmin
    })

    toast.add({
      title: 'Status berhasil disimpan',
      description: `Pengajuan ${detail.value.idPengajuan} diperbarui menjadi ${statusBaru}.`,
      color: 'success',
      icon: 'i-lucide-circle-check'
    })

    await loadDetail()
  } catch (error) {
    const message = getErrorMessage(error)
    statusError.value = message

    toast.add({
      title: 'Status gagal disimpan',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })

    if (isUnauthorizedMessage(message)) {
      clearAdminSession()
      await router.push('/login')
    }
  } finally {
    isSubmitting.value = false
  }
}

async function callAdminApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  if (!appsScriptApiUrl.value) throw new Error('URL Google Apps Script belum dikonfigurasi.')

  const token = sessionStorage.getItem('admin_token')
  if (!token) throw new Error('Token admin tidak ditemukan. Login dashboard terlebih dahulu.')

  const response = await fetch(appsScriptApiUrl.value, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, ...payload })
  })

  if (!response.ok) throw new Error(`Google Apps Script merespons ${response.status}.`)

  const result = await response.json() as ApiResult<T>
  if (!result.success) throw new Error(result.error || 'Request Google Apps Script gagal.')

  return result
}

function getTransitionConfirmMessage(currentStatus: PengajuanStatus, nextStatus: PengajuanStatus) {
  if (currentStatus === 'Disetujui' && nextStatus === 'Selesai') {
    return 'Tandai pengajuan ini sebagai Selesai? Pastikan proses kartu garansi sudah selesai.'
  }

  if (currentStatus === 'Disetujui' && nextStatus === 'Ditolak') {
    return 'Pengajuan ini sudah disetujui. Yakin ingin mengubahnya menjadi Ditolak?'
  }

  if (currentStatus === 'Ditolak' && nextStatus === 'Disetujui') {
    return 'Pengajuan ini sebelumnya ditolak. Yakin ingin menyetujuinya?'
  }

  if (currentStatus === 'Selesai') {
    return 'Pengajuan ini sudah Selesai. Yakin ingin membuka ulang statusnya?'
  }

  return ''
}

function normalizeRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function isValidStatus(status: string): status is PengajuanStatus {
  return VALID_STATUSES.includes(status as PengajuanStatus)
}

function isProductVerified(status: string | undefined) {
  return String(status || '').trim().toLowerCase() === 'verified'
}

function getStatusColor(status: PengajuanStatus) {
  const colors = {
    Baru: 'info',
    Disetujui: 'success',
    Ditolak: 'error',
    Selesai: 'neutral'
  } as const

  return colors[status] || 'neutral'
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function clearAdminSession() {
  sessionStorage.removeItem('admin_token')
  sessionStorage.removeItem('admin_nama')
  sessionStorage.removeItem('admin_username')
}

function isUnauthorizedMessage(message: string) {
  return message.includes('Unauthorized') || message.includes('Token admin')
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <UDashboardPanel id="pengajuan-detail">
    <template #header>
      <UDashboardNavbar :title="detail ? `Detail ${detail.idPengajuan}` : 'Detail Pengajuan'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Kembali ke Daftar"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/dashboard"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-7xl px-2 py-4">

        <!-- Error state -->
        <UAlert
          v-if="loadError && !isLoading"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="Gagal Memuat Data"
          :description="loadError"
          class="mb-6 rounded-xl"
        />

        <!-- Loading skeleton -->
        <div v-if="isLoading && !detail" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 space-y-6">
            <USkeleton class="h-32 rounded-2xl" />
            <USkeleton class="h-64 rounded-2xl" />
          </div>
          <div class="lg:col-span-4 space-y-6">
            <USkeleton class="h-48 rounded-2xl" />
            <USkeleton class="h-96 rounded-2xl" />
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="!detail"
          class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted bg-elevated/10 px-4 py-24 text-center"
        >
          <UIcon name="i-lucide-search-x" class="mb-4 size-12 text-muted" />
          <h3 class="text-lg font-semibold text-highlighted">Data Tidak Ditemukan</h3>
          <p class="mt-2 text-sm text-muted">ID Pengajuan mungkin salah atau telah dihapus.</p>
          <UButton label="Kembali" icon="i-lucide-arrow-left" color="primary" variant="soft" to="/dashboard" class="mt-6" />
        </div>

        <!-- Main Layout (Split Sidebar) -->
        <div v-else class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          
          <!-- KIRI: Konten Utama (Hero, Items, History) -->
          <div class="space-y-6 lg:col-span-8">
            
            <!-- Hero Section -->
            <div class="rounded-2xl border border-muted bg-elevated px-6 py-5 shadow-sm">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <h1 class="font-mono text-2xl font-bold tracking-tight text-highlighted">
                      {{ detail.idPengajuan }}
                    </h1>
                    <UBadge
                      :color="getStatusColor(detail.status)"
                      variant="soft"
                      :label="detail.status"
                      class="px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                    />
                  </div>
                  <p class="mt-1 text-sm text-muted">
                    Disubmit oleh <span class="font-medium text-highlighted">{{ detail.nama || '-' }}</span> pada {{ formatDateTime(detail.timestampSubmit) }}
                  </p>
                </div>
                <div v-if="detail.fileHardCopyUrl">
                  <UButton
                    label="Lihat Hard Copy"
                    icon="i-lucide-file-text"
                    trailing-icon="i-lucide-arrow-up-right"
                    color="primary"
                    variant="outline"
                    :to="detail.fileHardCopyUrl"
                    target="_blank"
                  />
                </div>
              </div>
            </div>

            <!-- Daftar Item -->
            <UCard class="rounded-2xl shadow-sm" :ui="{ body: 'p-0 sm:p-0' }">
              <template #header>
                <div class="flex items-center justify-between px-2">
                  <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
                    <UIcon name="i-lucide-package" class="text-primary" />
                    Daftar Item Pengajuan
                  </h2>
                  <span class="text-sm font-medium text-muted bg-muted/20 px-2 py-1 rounded-md">
                    Total: {{ detail.jumlahItem || 0 }}
                  </span>
                </div>
              </template>

              <div class="p-4">
                <UAlert
                  v-if="hasUnverifiedItems"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-triangle-alert"
                  title="Perhatian"
                  description="Beberapa item belum diverifikasi dan tidak akan masuk antrean cetak."
                />
              </div>

              <UTable
                :data="detail.items || []"
                :columns="itemColumns"
                class="w-full border-t border-muted/50"
              >
                <template #empty>
                  <div class="flex flex-col items-center py-12 text-center">
                    <UIcon name="i-lucide-box" class="mb-3 size-10 text-muted/50" />
                    <p class="text-sm text-muted">Tidak ada data item.</p>
                  </div>
                </template>
              </UTable>
            </UCard>

            <!-- Riwayat Status -->
            <UCard class="rounded-2xl shadow-sm" :ui="{ body: 'p-0 sm:p-0' }">
              <template #header>
                <h2 class="text-base font-semibold text-highlighted flex items-center gap-2 px-2">
                  <UIcon name="i-lucide-history" class="text-primary" />
                  Riwayat Perubahan Status
                </h2>
              </template>
              
              <UTable
                :data="detail.riwayat || []"
                :columns="historyColumns"
                class="w-full border-t border-muted/50"
              >
                <template #empty>
                  <div class="p-8 text-center text-sm text-muted">
                    Belum ada riwayat perubahan status tercatat.
                  </div>
                </template>
              </UTable>
            </UCard>

          </div>

          <!-- KANAN: Form Aksi & Info Detail (Sidebar) -->
          <div class="space-y-6 lg:col-span-4 lg:sticky lg:top-4">
            
            <!-- Update Status Panel -->
            <UCard class="rounded-2xl border-primary/20 bg-primary/5 shadow-sm ring-1 ring-primary/20">
              <template #header>
                <h2 class="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <UIcon name="i-lucide-zap" />
                  Tindakan Admin
                </h2>
              </template>

              <div class="space-y-4">
                <div class="text-sm border-b border-muted/40 pb-3 mb-3">
                  <span class="text-muted block mb-1">Status Terakhir:</span>
                  <div class="font-medium text-highlighted">
                    {{ formatDateTime(detail.tanggalUpdateStatusTerakhir) }}
                    <span class="text-muted font-normal block text-xs mt-0.5">oleh {{ detail.userUpdateStatus || '-' }}</span>
                  </div>
                </div>

                <UAlert v-if="transitionWarning" color="warning" variant="subtle" :description="transitionWarning" class="text-xs" />
                <UAlert v-if="statusNotice" color="info" variant="subtle" :description="statusNotice" class="text-xs" />
                <UAlert v-if="statusError" color="error" variant="subtle" :description="statusError" class="text-xs" />

                <form class="space-y-4" @submit.prevent="submitStatus">
                  <UFormField label="Ubah Status Ke" name="statusBaru">
                    <USelect
                      v-model="formState.statusBaru"
                      :items="statusItems"
                      class="w-full"
                      size="lg"
                    />
                  </UFormField>

                  <UFormField label="Catatan Admin" name="catatanAdmin">
                    <UTextarea
                      v-model="formState.catatanAdmin"
                      :rows="3"
                      placeholder="Alasan penolakan / catatan internal..."
                      class="w-full"
                    />
                  </UFormField>

                  <UButton
                    type="submit"
                    label="Simpan Perubahan"
                    icon="i-lucide-check"
                    color="primary"
                    block
                    size="lg"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                  />
                </form>
              </div>
            </UCard>

            <!-- Informasi Lengkap List -->
            <UCard class="rounded-2xl shadow-sm">
              <template #header>
                <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
                  <UIcon name="i-lucide-info" class="text-primary" />
                  Informasi Detail
                </h2>
              </template>
              
              <div class="divide-y divide-muted/40">
                <div 
                  v-for="field in infoFields" 
                  :key="field.label" 
                  class="py-3 first:pt-0 last:pb-0 flex flex-col gap-1"
                >
                  <span class="text-xs font-medium text-muted uppercase tracking-wide">{{ field.label }}</span>
                  
                  <UButton
                    v-if="field.href"
                    :to="field.href"
                    target="_blank"
                    color="primary"
                    variant="link"
                    class="p-0 justify-start h-auto font-medium"
                  >
                    {{ field.value }} <UIcon name="i-lucide-external-link" class="ml-1 size-3" />
                  </UButton>
                  
                  <span 
                    v-else 
                    class="text-sm text-highlighted"
                    :class="field.mono ? 'font-mono' : 'font-medium'"
                  >
                    {{ field.value }}
                  </span>
                </div>
              </div>
            </UCard>

          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>