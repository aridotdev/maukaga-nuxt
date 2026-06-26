/**
 * Detail pengajuan dengan cache.
 * Bisa dipanggil berkali-kali (mis. navigasi bolak-balik list → detail) tanpa
 * request berulang ke Apps Script dalam window TTL.
 *
 * - `getDetail(id)`: load detail
 * - `setItemStatus(noItem, status, catatan)`: update + invalidate cache
 */

const DETAIL_TTL = 60_000

export type PengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Diterima' | 'Selesai'
export type ItemApprovalStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'

type RiwayatStatus = {
  timestamp?: string
  noItem?: number | string
  statusLama?: string
  statusBaru?: string
  catatanAdmin?: string
  user?: string
}

export type DetailItem = {
  noItem?: number | string
  produk?: string
  model?: string
  nomorSeri?: string
  modelNormalized?: string
  produkStatus?: string
  produkSumber?: string
  statusItem?: ItemApprovalStatus
  catatanAdminItem?: string
  tanggalUpdateStatusItem?: string
  userUpdateStatusItem?: string
}

export type DetailPengajuan = {
  idPengajuan: string
  timestampSubmit?: string
  nama?: string
  bagianCabang?: string
  pemilik?: string
  alasanPengajuan?: string
  tanggalForm?: string
  fileHardCopyUrl?: string
  fileHardCopyId?: string
  evidenceAttachmentUrls?: string[]
  evidenceAttachmentIds?: string[]
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

export function usePengajuanDetail(idRef: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(idRef))
  const { callApi } = useAppsScriptApi()
  const { invalidate } = useAppSheetInvalidate()
  const toast = useToast()

  const query = useAppSheetQuery<DetailPengajuan>(
    'getDetail',
    { idPengajuan: id.value },
    { ttl: DETAIL_TTL }
  )

  function getParams() {
    return { idPengajuan: id.value }
  }

  async function load(force = false) {
    if (force) return query.refresh()
    return query.ensureLoaded()
  }

  // Patch lokal untuk optimistic update + invalidate cache 'getDashboard'
  // sehingga list di halaman lain ikut segar.
  function patchItem(noItem: number | string, statusBaru: ItemApprovalStatus, catatanAdmin: string) {
    query.mutate((current) => {
      if (!current || !Array.isArray(current.items)) return current
      const items = current.items.map((it) => {
        if (String(it.noItem) !== String(noItem)) return it
        return {
          ...it,
          statusItem: statusBaru,
          catatanAdminItem: catatanAdmin,
          tanggalUpdateStatusItem: new Date().toISOString()
        }
      })
      // Ringkasan status parent (sederhana): kalau semua Ditolak → Ditolak,
      // kalau ada Disetujui → Disetujui, else 'Baru' (di-handle server sebenarnya).
      return { ...current, items }
    })
    invalidate('getDashboard')
  }

  async function setItemStatus(
    noItem: number | string,
    statusBaru: ItemApprovalStatus,
    catatanAdmin: string
  ) {
    if (!id.value) throw new Error('ID Pengajuan tidak valid.')

    // Optimistic: patch dulu.
    patchItem(noItem, statusBaru, catatanAdmin)

    try {
      await callApi<Record<string, never>>('updateItemStatus', {
        idPengajuan: id.value,
        noItem,
        statusBaru,
        catatanAdmin
      })

      // Server sudah konfirmasi. Refresh detail untuk sinkronkan status parent.
      // Tetap return cepat — UI sudah update.
      void query.refresh()
    } catch (err) {
      // Rollback dengan fetch ulang.
      toast.add({
        title: 'Gagal memperbarui status',
        description: err instanceof Error ? err.message : String(err),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      void query.refresh()
      throw err
    }
  }

  async function setPengajuanStatus(statusBaru: PengajuanStatus, catatanAdmin: string) {
    if (!id.value) throw new Error('ID Pengajuan tidak valid.')

    const previous = query.data.value
    query.mutate((current) => current
      ? {
          ...current,
          status: statusBaru,
          catatanAdmin,
          tanggalUpdateStatusTerakhir: new Date().toISOString()
        }
      : current)

    try {
      await callApi<Record<string, never>>('updateStatus', {
        idPengajuan: id.value,
        statusBaru,
        catatanAdmin
      })

      invalidate('getDashboard')
      void query.refresh()
    } catch (err) {
      query.mutate(() => previous)
      toast.add({
        title: 'Gagal memperbarui status pengajuan',
        description: err instanceof Error ? err.message : String(err),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      throw err
    }
  }

  return {
    detail: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isRefreshing: query.isRefreshing,
    load,
    refresh: query.refresh,
    invalidate: query.invalidate,
    setItemStatus,
    setPengajuanStatus,
    getParams
  }
}
