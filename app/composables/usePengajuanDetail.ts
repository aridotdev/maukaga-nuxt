/**
 * Detail pengajuan dengan cache.
 * Bisa dipanggil berkali-kali (mis. navigasi bolak-balik list → detail) tanpa
 * request berulang ke Apps Script dalam window TTL.
 *
 * - `getDetail(id)`: load detail
 * - `setItemDecision(noItem, keputusan, catatan)`: update keputusan item + invalidate cache
 * - `completeItem(noItem, catatan)`: tandai item approved sebagai selesai
 */

const DETAIL_TTL = 60_000

export type PengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Diterima' | 'Selesai'
export type ItemApprovalStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'
export type ItemDecisionStatus = 'Disetujui' | 'Ditolak' | ''

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
  keputusanItem?: ItemDecisionStatus | string
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
  function patchItem(
    noItem: number | string,
    patch: Pick<DetailItem, 'statusItem' | 'keputusanItem' | 'catatanAdminItem' | 'tanggalUpdateStatusItem'>
  ) {
    query.mutate((current) => {
      if (!current || !Array.isArray(current.items)) return current
      const items = current.items.map((it) => {
        if (String(it.noItem) !== String(noItem)) return it
        return { ...it, ...patch }
      })
      return { ...current, items }
    })
    invalidate('getDashboard')
  }

  function deriveItemStatusFromDecision(decision: ItemDecisionStatus): ItemApprovalStatus {
    if (decision === 'Disetujui' || decision === 'Ditolak') return decision
    return 'Baru'
  }

  function normalizeItemDecision(decision: string): ItemDecisionStatus {
    if (decision === 'Disetujui' || decision === 'Ditolak') return decision
    return ''
  }

  async function setItemDecision(
    noItem: number | string,
    keputusanItem: ItemDecisionStatus,
    catatanAdmin: string
  ) {
    if (!id.value) throw new Error('ID Pengajuan tidak valid.')

    const decision = normalizeItemDecision(keputusanItem)
    patchItem(noItem, {
      statusItem: deriveItemStatusFromDecision(decision),
      keputusanItem: decision,
      catatanAdminItem: catatanAdmin,
      tanggalUpdateStatusItem: new Date().toISOString()
    })

    try {
      await callApi<Record<string, never>>('updateItemStatus', {
        idPengajuan: id.value,
        noItem,
        keputusanItem: decision,
        catatanAdmin
      })

      // Server sudah konfirmasi. Refresh detail untuk sinkronkan status parent.
      // Tetap return cepat — UI sudah update.
      void query.refresh()
    } catch (err) {
      // Rollback dengan fetch ulang.
      toast.add({
        title: 'Gagal memperbarui keputusan item',
        description: err instanceof Error ? err.message : String(err),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      void query.refresh()
      throw err
    }
  }

  async function completeItem(noItem: number | string, catatanAdmin: string) {
    if (!id.value) throw new Error('ID Pengajuan tidak valid.')

    const currentItem = query.data.value?.items?.find((item) => String(item.noItem) === String(noItem))
    const decision = normalizeItemDecision(String(currentItem?.keputusanItem || ''))

    patchItem(noItem, {
      statusItem: 'Selesai',
      keputusanItem: decision,
      catatanAdminItem: catatanAdmin,
      tanggalUpdateStatusItem: new Date().toISOString()
    })

    try {
      await callApi<Record<string, never>>('updateItemStatus', {
        idPengajuan: id.value,
        noItem,
        statusBaru: 'Selesai',
        catatanAdmin
      })

      void query.refresh()
    } catch (err) {
      toast.add({
        title: 'Gagal menandai item selesai',
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
    setItemDecision,
    completeItem,
    setPengajuanStatus,
    getParams
  }
}
