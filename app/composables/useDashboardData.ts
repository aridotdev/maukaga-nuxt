/**
 * Shared dashboard data.
 * Menggantikan duplikasi `getDashboard` di HomeStats & HomePengajuan.
 * Cukup 1 call ke Apps Script, dishare ke semua komponen.
 */

type DashboardStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Diterima' | 'Selesai'
type DashboardItemStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'
type DashboardItemDecision = 'Disetujui' | 'Ditolak' | ''

type DashboardSummary = {
  total?: number
  totalItems?: number
  baru?: number
  disetujui?: number
  ditolak?: number
  diprint?: number
  dikirim?: number
  diterima?: number
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
  itemStatuses?: Array<{
    noItem: number | string
    status: DashboardItemStatus | string
    keputusanItem?: DashboardItemDecision | string
  }>
}

type DashboardResponse = {
  summary?: DashboardSummary
  rows?: DashboardRow[]
  totalRows?: number
  page?: number
  pageSize?: number
  admin?: string
}

type DashboardStore = {
  data: DashboardResponse | null
  error: string | null
  fetchedAt: number
  inflight: Promise<void> | null
  loadedRows: number
  totalRows: number
  loadedPages: number
  totalPages: number
}

type UseDashboardDataOptions = {
  loadAll?: boolean
}

const DASHBOARD_TTL = 30_000
const DASHBOARD_PAGE_SIZE = 100
const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set(['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'])

function getTime(value: string): number {
  const time = new Date(value || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function toStatus(value: string | DashboardStatus): DashboardStatus {
  return VALID_STATUSES.has(value as DashboardStatus) ? (value as DashboardStatus) : 'Baru'
}

function normalizeRows(rows: DashboardRow[] = []) {
  return rows.map((row) => ({
    ...row,
    status: toStatus(row.status)
  }))
}

function mergeDashboardRows(rows: DashboardRow[]) {
  const seen = new Set<string>()
  const merged: DashboardRow[] = []

  for (const row of rows) {
    const key = row.idPengajuan
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(row)
  }

  return merged
}

function createEmptyDashboardStore(): DashboardStore {
  return {
    data: null,
    error: null,
    fetchedAt: 0,
    inflight: null,
    loadedRows: 0,
    totalRows: 0,
    loadedPages: 0,
    totalPages: 0
  }
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  if (options.loadAll) return useDashboardAllData()

  const query = useAppSheetQuery<DashboardResponse>(
    'getDashboard',
    { page: 1, pageSize: 20 },
    { ttl: DASHBOARD_TTL }
  )

  const summary = computed<DashboardSummary>(() => query.data.value?.summary ?? {})
  const rows = computed<DashboardRow[]>(() => normalizeRows(query.data.value?.rows ?? []))
  const loadedRows = computed(() => rows.value.length)
  const totalRows = computed(() => Number(query.data.value?.totalRows ?? rows.value.length))
  const loadedPages = computed(() => Number(query.data.value?.page ?? (rows.value.length ? 1 : 0)))
  const totalPages = computed(() => {
    if (!totalRows.value) return 0
    return Math.max(Math.ceil(totalRows.value / Number(query.data.value?.pageSize || 20)), 1)
  })
  const isFullyLoaded = computed(() => loadedRows.value >= totalRows.value)

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
    loadedRows,
    totalRows,
    loadedPages,
    totalPages,
    isFullyLoaded,
    error: query.error,
    refresh: query.refresh,
    ensureLoaded: query.ensureLoaded,
    invalidate: query.invalidate
  }
}

function useDashboardAllData() {
  const { callApi } = useAppsScriptApi()
  const store = useState<DashboardStore>('dashboard-all-data-store', createEmptyDashboardStore)
  const invalidations = useAppSheetInvalidationState()

  watch(
    () => [invalidations.value.getDashboard, invalidations.value['*']],
    () => {
      store.value.fetchedAt = 0
    }
  )

  const summary = computed<DashboardSummary>(() => store.value.data?.summary ?? {})
  const rows = computed<DashboardRow[]>(() => normalizeRows(store.value.data?.rows ?? []))
  const latestRows = computed<DashboardRow[]>(() => {
    return [...rows.value]
      .sort((a, b) => getTime(b.timestampSubmit) - getTime(a.timestampSubmit))
      .slice(0, 5)
      .map((row, index) => ({ ...row, nomor: index + 1 }))
  })

  const isLoading = computed(() => store.value.inflight !== null && store.value.data === null)
  const isRefreshing = computed(() => store.value.inflight !== null && store.value.data !== null)
  const loadedRows = computed(() => store.value.loadedRows)
  const totalRows = computed(() => store.value.totalRows)
  const loadedPages = computed(() => store.value.loadedPages)
  const totalPages = computed(() => store.value.totalPages)
  const isFullyLoaded = computed(() => totalRows.value === 0 || loadedRows.value >= totalRows.value)
  const error = computed(() => store.value.error)

  function isFresh() {
    return store.value.fetchedAt > 0 && Date.now() - store.value.fetchedAt < DASHBOARD_TTL
  }

  async function fetchAll(force = false) {
    if (!force && isFresh() && store.value.data) return
    if (store.value.inflight) return store.value.inflight

    const promise = fetchDashboardPages()
    store.value.inflight = promise

    try {
      await promise
    } finally {
      store.value.inflight = null
      store.value.fetchedAt = Date.now()
    }
  }

  async function fetchDashboardPages() {
    store.value.error = null

    try {
      const first = await fetchDashboardPage(1)
      const firstRows = first.rows ?? []
      const pageSize = Number(first.pageSize || DASHBOARD_PAGE_SIZE)
      const total = Number(first.totalRows ?? firstRows.length)
      const totalPageCount = Math.max(Math.ceil(total / pageSize), 1)
      const collectedRows = [...firstRows]

      updateStore(first, collectedRows, {
        loadedPages: 1,
        totalPages: totalPageCount,
        totalRows: total
      })

      for (let page = 2; page <= totalPageCount; page += 1) {
        const next = await fetchDashboardPage(page)
        collectedRows.push(...(next.rows ?? []))
        updateStore(first, collectedRows, {
          loadedPages: page,
          totalPages: totalPageCount,
          totalRows: total
        })
      }
    } catch (err) {
      store.value.error = err instanceof Error ? err.message : String(err)
    }
  }

  async function fetchDashboardPage(page: number) {
    const result = await callApi<DashboardResponse>('getDashboard', {
      page,
      pageSize: DASHBOARD_PAGE_SIZE
    })

    return result.data ?? {}
  }

  function updateStore(base: DashboardResponse, rows: DashboardRow[], meta: {
    loadedPages: number
    totalPages: number
    totalRows: number
  }) {
    const mergedRows = mergeDashboardRows(rows)

    store.value.data = {
      ...base,
      rows: mergedRows,
      totalRows: meta.totalRows,
      page: meta.loadedPages,
      pageSize: DASHBOARD_PAGE_SIZE
    }
    store.value.loadedRows = mergedRows.length
    store.value.totalRows = meta.totalRows
    store.value.loadedPages = meta.loadedPages
    store.value.totalPages = meta.totalPages
  }

  async function refresh() {
    await fetchAll(true)
  }

  function ensureLoaded() {
    if (store.value.inflight) return
    if (isFresh() && store.value.data) return
    void fetchAll(false)
  }

  function invalidate() {
    store.value.fetchedAt = 0
  }

  return {
    summary,
    rows,
    latestRows,
    isLoading,
    isRefreshing,
    loadedRows,
    totalRows,
    loadedPages,
    totalPages,
    isFullyLoaded,
    error,
    refresh,
    ensureLoaded,
    invalidate
  }
}
