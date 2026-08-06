/**
 * Detail pengajuan dengan cache.
 * Bisa dipanggil berkali-kali (mis. navigasi bolak-balik list → detail) tanpa
 * request berulang ke Apps Script dalam window TTL.
 *
 * - `getDetail(id)`: load detail
 * - `setItemDecision(noItem, keputusan, catatan)`: update keputusan item + patch cache list
 */

import type { DashboardRow } from '~/composables/useDashboardData'

const DETAIL_TTL = 60_000

export type PengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Selesai'
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
  keputusanItem?: ItemDecisionStatus | string
  catatanAdminItem?: string
  tanggalUpdateKeputusanItem?: string
  userUpdateKeputusanItem?: string
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

type DetailMutationResponse = {
  detail?: DetailPengajuan
  row?: DashboardRow
  status?: PengajuanStatus | string
  keputusanItem?: ItemDecisionStatus | string
}

export function usePengajuanDetail(idRef: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(idRef))
  const { callApi } = useAppsScriptApi()
  const { invalidate } = useAppSheetInvalidate()
  const {
    patchItemDecision: patchCachedItemDecision,
    patchPengajuanStatus: patchCachedPengajuanStatus,
    patchPengajuanRow: patchCachedPengajuanRow
  } = useDashboardPengajuanCache()
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

  // Patch lokal untuk optimistic update detail dan cache list yang sudah termuat.
  function patchItem(
    noItem: number | string,
    patch: Pick<DetailItem, 'keputusanItem' | 'catatanAdminItem' | 'tanggalUpdateKeputusanItem'>
  ) {
    query.mutate((current) => {
      if (!current || !Array.isArray(current.items)) return current
      const items = current.items.map((it) => {
        if (String(it.noItem) !== String(noItem)) return it
        return { ...it, ...patch }
      })
      return { ...current, items }
    })
    patchCachedItemDecision(id.value, noItem, patch.keputusanItem || '')
  }

  function normalizeItemDecision(decision: string): ItemDecisionStatus {
    if (decision === 'Disetujui' || decision === 'Ditolak') return decision
    return ''
  }

  function applyMutationResponse(data: DetailMutationResponse | undefined) {
    if (!data) return false

    const row = data.row
    if (row?.idPengajuan) {
      patchCachedPengajuanRow(row)
    }

    const detail = data.detail
    if (detail?.idPengajuan) {
      query.mutate(() => detail)
      return true
    }

    if (data.status) {
      query.mutate((current) => current
        ? { ...current, status: data.status as PengajuanStatus }
        : current)
      patchCachedPengajuanStatus(id.value, data.status)
    }

    return false
  }

  async function setItemDecision(
    noItem: number | string,
    keputusanItem: ItemDecisionStatus,
    catatanAdmin: string
  ) {
    if (!id.value) throw new Error('ID Pengajuan tidak valid.')

    const previous = query.data.value
    const previousDecision = previous?.items
      ?.find(item => String(item.noItem) === String(noItem))
      ?.keputusanItem
    const decision = normalizeItemDecision(keputusanItem)
    patchItem(noItem, {
      keputusanItem: decision,
      catatanAdminItem: catatanAdmin,
      tanggalUpdateKeputusanItem: new Date().toISOString()
    })

    try {
      const result = await callApi<DetailMutationResponse>('updateItemDecision', {
        idPengajuan: id.value,
        noItem,
        keputusanItem: decision,
        catatanAdmin
      })

      // Server sudah konfirmasi. Refresh detail untuk sinkronkan status parent.
      // Tetap return cepat — UI sudah update.
      invalidate('getDashboardSummary')
      if (!applyMutationResponse(result.data)) void query.refresh()
    } catch (err) {
      // Rollback dengan fetch ulang.
      query.mutate(() => previous)
      patchCachedItemDecision(id.value, noItem, normalizeItemDecision(String(previousDecision || '')))
      if (previous) patchCachedPengajuanStatus(id.value, previous.status)
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
    patchCachedPengajuanStatus(id.value, statusBaru)

    try {
      const result = await callApi<DetailMutationResponse>('updateStatus', {
        idPengajuan: id.value,
        statusBaru,
        catatanAdmin
      })

      invalidate('getDashboardSummary')
      if (!applyMutationResponse(result.data)) void query.refresh()
    } catch (err) {
      query.mutate(() => previous)
      if (previous) {
        patchCachedPengajuanStatus(id.value, previous.status)
      }
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
    setPengajuanStatus,
    getParams
  }
}
