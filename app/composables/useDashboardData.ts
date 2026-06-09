/**
 * Shared dashboard data.
 * Menggantikan duplikasi `getDashboard` di HomeStats & HomePengajuan.
 * Cukup 1 call ke Apps Script, dishare ke semua komponen.
 */

type DashboardStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'

type DashboardSummary = {
  total?: number
  totalItems?: number
  baru?: number
  disetujui?: number
  ditolak?: number
  selesai?: number
  itemBaru?: number
  itemDisetujui?: number
  itemDitolak?: number
  itemSelesai?: number
}

type DashboardRow = {
  idPengajuan: string
  timestampSubmit: string
  nama: string
  bagianCabang: string
  jumlahItem: number | string
  status: DashboardStatus | string
}

type DashboardResponse = {
  summary?: DashboardSummary
  rows?: DashboardRow[]
}

const DASHBOARD_TTL = 30_000
const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set(['Baru', 'Disetujui', 'Ditolak', 'Selesai'])

function getTime(value: string): number {
  const time = new Date(value || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function toStatus(value: string | DashboardStatus): DashboardStatus {
  return VALID_STATUSES.has(value as DashboardStatus) ? (value as DashboardStatus) : 'Baru'
}

export function useDashboardData() {
  const query = useAppSheetQuery<DashboardResponse>(
    'getDashboard',
    { page: 1, pageSize: 20 },
    { ttl: DASHBOARD_TTL }
  )

  const summary = computed<DashboardSummary>(() => query.data.value?.summary ?? {})
  const rows = computed<DashboardRow[]>(() => (query.data.value?.rows ?? []).map((row) => ({
    ...row,
    status: toStatus(row.status)
  })))

  const latestRows = computed<DashboardRow[]>(() => {
    return [...rows.value]
      .sort((a, b) => getTime(b.timestampSubmit) - getTime(a.timestampSubmit))
      .slice(0, 5)
      .map((row, index) => ({ ...row, nomor: index + 1 }))
  })

  return {
    summary,
    rows,
    latestRows,
    isLoading: query.isLoading,
    isRefreshing: query.isRefreshing,
    error: query.error,
    refresh: query.refresh,
    ensureLoaded: query.ensureLoaded,
    invalidate: query.invalidate
  }
}
