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
    label: 'ID Pengajuan',
    value: detail.value.idPengajuan || '-',
    mono: true
  }, {
    label: 'Waktu Submit',
    value: formatDateTime(detail.value.timestampSubmit)
  }, {
    label: 'Nama',
    value: detail.value.nama || '-'
  }, {
    label: 'Bagian/Cabang',
    value: detail.value.bagianCabang || '-'
  }, {
    label: 'Pemilik',
    value: detail.value.pemilik || '-'
  }, {
    label: 'Tanggal Form',
    value: formatDateOnly(detail.value.tanggalForm)
  }, {
    label: 'Alasan Pengajuan',
    value: detail.value.alasanPengajuan || '-'
  }, {
    label: 'Catatan Tambahan',
    value: detail.value.catatanTambahan || '-'
  }, {
    label: 'Jumlah Item',
    value: String(detail.value.jumlahItem || 0)
  }, {
    label: 'File Hard Copy',
    value: detail.value.fileHardCopyUrl ? 'Buka file' : '-',
    href: detail.value.fileHardCopyUrl
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

function formatDateOnly(value: string | undefined) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
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
          <UBadge
            v-if="detail"
            :color="getStatusColor(detail.status)"
            variant="subtle"
            :label="detail.status"
            class="font-semibold"
          />
          <UButton
            label="Kembali"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="soft"
            to="/dashboard"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UAlert
          v-if="loadError && !isLoading"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="Detail pengajuan belum bisa dimuat"
          :description="loadError"
        />

        <div
          v-if="isLoading && !detail"
          class="space-y-4"
        >
          <USkeleton class="h-24 rounded-lg" />
          <USkeleton class="h-64 rounded-lg" />
          <USkeleton class="h-48 rounded-lg" />
        </div>

        <div
          v-else-if="!detail"
          class="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted bg-elevated/30 px-4 py-12 text-center"
        >
          <UIcon
            name="i-lucide-file-question"
            class="size-10 text-muted"
          />
          <p class="mt-3 text-sm font-medium text-highlighted">
            Pengajuan tidak ditemukan
          </p>
          <p class="mt-1 max-w-md text-sm text-muted">
            Periksa kembali ID pengajuan atau kembali ke dashboard.
          </p>
          <UButton
            label="Kembali ke Dashboard"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="soft"
            to="/dashboard"
            class="mt-4"
          />
        </div>

        <template v-else>
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    Informasi Pengajuan
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    Data lengkap dari action getDetail.
                  </p>
                </div>
                <UButton
                  v-if="detail.fileHardCopyUrl"
                  label="Buka File Hard Copy"
                  icon="i-lucide-external-link"
                  color="neutral"
                  variant="outline"
                  :to="detail.fileHardCopyUrl"
                  target="_blank"
                />
              </div>
            </template>

            <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="field in infoFields"
                :key="field.label"
                class="rounded-lg border border-muted bg-elevated/25 p-4"
              >
                <dt class="text-xs font-medium uppercase tracking-wide text-muted">
                  {{ field.label }}
                </dt>
                <dd
                  class="mt-1 text-sm font-semibold text-highlighted"
                  :class="field.mono ? 'font-mono' : ''"
                >
                  <UButton
                    v-if="field.href"
                    :to="field.href"
                    target="_blank"
                    color="primary"
                    variant="link"
                    trailing-icon="i-lucide-external-link"
                    class="p-0"
                  >
                    {{ field.value }}
                  </UButton>
                  <span v-else>{{ field.value }}</span>
                </dd>
              </div>
            </dl>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-highlighted">
                    Daftar Item
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    Item pengajuan dan status verifikasi nama produk.
                  </p>
                </div>
                <UBadge
                  :label="`${detail.items?.length || 0} Item`"
                  color="neutral"
                  variant="subtle"
                />
              </div>
            </template>

            <UAlert
              v-if="hasUnverifiedItems"
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
              title="Ada nama produk belum terverifikasi"
              description="Item yang belum verified tidak masuk antrean cetak sampai diverifikasi."
              class="mb-4"
            />

            <UTable
              :data="detail.items || []"
              :columns="itemColumns"
              class="w-full"
              :ui="{
                base: 'min-w-190',
                th: 'text-xs font-semibold uppercase text-muted',
                td: 'text-sm align-middle'
              }"
            >
              <template #empty>
                <div class="py-8 text-center text-sm text-muted">
                  Tidak ada item pada pengajuan ini.
                </div>
              </template>
            </UTable>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Update Status / Catatan
                </h2>
                <p class="mt-1 text-sm text-muted">
                  Catatan admin hanya disimpan saat status berubah.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <div class="rounded-lg border border-muted bg-elevated/25 p-4 text-sm text-muted">
                <div>Status saat ini: <UBadge :color="getStatusColor(detail.status)" variant="subtle" :label="detail.status" /></div>
                <div class="mt-2">Update terakhir: {{ formatDateTime(detail.tanggalUpdateStatusTerakhir) }}</div>
                <div class="mt-1">User updater: {{ detail.userUpdateStatus || '-' }}</div>
              </div>

              <UAlert
                v-if="transitionWarning"
                color="warning"
                variant="subtle"
                icon="i-lucide-triangle-alert"
                title="Perhatikan konsekuensi status"
                :description="transitionWarning"
              />

              <UAlert
                v-if="statusNotice"
                color="warning"
                variant="subtle"
                icon="i-lucide-info"
                title="Tidak ada perubahan"
                :description="statusNotice"
              />

              <UAlert
                v-if="statusError"
                color="error"
                variant="subtle"
                icon="i-lucide-circle-alert"
                title="Update status gagal"
                :description="statusError"
              />

              <form
                class="grid gap-4 sm:grid-cols-2"
                @submit.prevent="submitStatus"
              >
                <UFormField
                  label="Status Baru"
                  name="statusBaru"
                >
                  <USelect
                    v-model="formState.statusBaru"
                    :items="statusItems"
                    class="w-full"
                    placeholder="Pilih status"
                  />
                </UFormField>

                <UFormField
                  label="Catatan Admin"
                  name="catatanAdmin"
                  class="sm:col-span-2"
                >
                  <UTextarea
                    v-model="formState.catatanAdmin"
                    :rows="5"
                    placeholder="Isi catatan admin saat status berubah. Wajib jika status Ditolak."
                  />
                </UFormField>

                <div class="flex justify-end sm:col-span-2">
                  <UButton
                    type="submit"
                    label="Simpan Status"
                    icon="i-lucide-save"
                    color="primary"
                    :loading="isSubmitting"
                    :disabled="isSubmitting"
                  />
                </div>
              </form>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Riwayat Status
                </h2>
                <p class="mt-1 text-sm text-muted">
                  Log audit perubahan status pengajuan.
                </p>
              </div>
            </template>

            <UTable
              :data="detail.riwayat || []"
              :columns="historyColumns"
              class="w-full"
              :ui="{
                base: 'min-w-160',
                th: 'text-xs font-semibold uppercase text-muted',
                td: 'text-sm align-middle'
              }"
            >
              <template #empty>
                <div class="py-8 text-center text-sm text-muted">
                  Belum ada riwayat status.
                </div>
              </template>
            </UTable>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
