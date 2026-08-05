type DashboardStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Selesai'
type DashboardItemDecision = 'Disetujui' | 'Ditolak' | ''
type DashboardItemDecisionFilter = 'all' | 'pending' | Exclude<DashboardItemDecision, ''>
type PengajuanListSortDirection = 'asc' | 'desc'

export type DashboardSummary = {
  total?: number
  totalItems?: number
  baru?: number
  disetujui?: number
  ditolak?: number
  diprint?: number
  dikirim?: number
  selesai?: number
  itemDisetujui?: number
  itemDitolak?: number
}

export type DashboardItem = {
  noItem: number | string
  model?: string
  nomorSeri?: string
  keputusanItem?: DashboardItemDecision | string
}

export type DashboardRow = {
  idPengajuan: string
  timestampSubmit: string
  nama: string
  bagianCabang: string
  jumlahItem: number | string
  status: DashboardStatus | string
  items?: DashboardItem[]
}

export type DashboardResponse = {
  summary?: DashboardSummary
  rows?: DashboardRow[]
  totalRows?: number
  page?: number
  pageSize?: number
  admin?: string
}

export type PengajuanListParams = {
  page?: number
  pageSize?: number
  search?: string
  itemDecision?: DashboardItemDecisionFilter
  status?: DashboardStatus | 'all' | ''
  sortBy?: string
  sortDirection?: PengajuanListSortDirection
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
const PENGAJUAN_LIST_TTL = 15_000
const DASHBOARD_PAGE_SIZE = 100
const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set(['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Selesai'])

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

function normalizePengajuanListParams(params: PengajuanListParams = {}) {
  return {
    page: Math.max(Number(params.page || 1), 1),
    pageSize: Math.min(Math.max(Number(params.pageSize || 15), 1), 100),
    search: String(params.search || '').trim(),
    itemDecision: params.itemDecision || 'all',
    status: params.status && params.status !== 'all' ? params.status : '',
    sortBy: params.sortBy || 'timestampSubmit',
    sortDirection: params.sortDirection || 'desc'
  }
}

export function useDashboardSummaryData() {
  const invalidations = useAppSheetInvalidationState()
  const query = useAppSheetQuery<{ summary?: DashboardSummary, admin?: string }>(
    'getDashboardSummary',
    {},
    { ttl: DASHBOARD_TTL }
  )

  watch(
    () => [invalidations.value.getDashboardSummary, invalidations.value['*']],
    () => {
      query.invalidate()
      if (query.data.value) void query.refresh()
    }
  )

  return {
    summary: computed<DashboardSummary>(() => query.data.value?.summary ?? {}),
    isLoading: query.isLoading,
    isRefreshing: query.isRefreshing,
    error: query.error,
    refresh: query.refresh,
    ensureLoaded: query.ensureLoaded,
    invalidate: query.invalidate
  }
}

export function useDashboardLatestData(limit = 5) {
  const invalidations = useAppSheetInvalidationState()
  const query = useAppSheetQuery<DashboardResponse>(
    'getDashboardLatest',
    { limit },
    { ttl: DASHBOARD_TTL }
  )

  watch(
    () => [invalidations.value.getDashboardLatest, invalidations.value['*']],
    () => {
      query.invalidate()
      if (query.data.value) void query.refresh()
    }
  )

  const latestRows = computed<DashboardRow[]>(() =>
    normalizeRows(query.data.value?.rows ?? [])
      .slice(0, limit)
      .map((row, index) => ({ ...row, nomor: index + 1 }))
  )

  return {
    latestRows,
    rows: latestRows,
    isLoading: query.isLoading,
    isRefreshing: query.isRefreshing,
    error: query.error,
    refresh: query.refresh,
    ensureLoaded: query.ensureLoaded,
    invalidate: query.invalidate
  }
}

export function usePengajuanListData(paramsRef: MaybeRefOrGetter<PengajuanListParams>) {
  const { callApi } = useAppsScriptApi()
  const invalidations = useAppSheetInvalidationState()
  const data = shallowRef<DashboardResponse | null>(null)
  const error = ref<string | null>(null)
  const inflight = ref(false)
  const fetchedAt = ref(0)
  const lastKey = ref('')
  const requestId = ref(0)

  const rows = computed<DashboardRow[]>(() => normalizeRows(data.value?.rows ?? []))
  const loadedRows = computed(() => rows.value.length)
  const totalRows = computed(() => Number(data.value?.totalRows ?? rows.value.length))
  const page = computed(() => Number(data.value?.page ?? getParams().page))
  const pageSize = computed(() => Number(data.value?.pageSize ?? getParams().pageSize))
  const totalPages = computed(() => {
    if (!totalRows.value) return 0
    return Math.max(Math.ceil(totalRows.value / pageSize.value), 1)
  })
  const isLoading = computed(() => inflight.value && data.value === null)
  const isRefreshing = computed(() => inflight.value && data.value !== null)
  const isFullyLoaded = computed(() => totalPages.value === 0 || page.value >= totalPages.value)

  function getParams() {
    return normalizePengajuanListParams(toValue(paramsRef))
  }

  function getKey() {
    return JSON.stringify(getParams())
  }

  function isFresh(key: string) {
    return lastKey.value === key && fetchedAt.value > 0 && Date.now() - fetchedAt.value < PENGAJUAN_LIST_TTL
  }

  async function fetchList(force = false) {
    const key = getKey()
    if (!force && data.value && isFresh(key)) return

    const currentRequestId = requestId.value + 1
    requestId.value = currentRequestId
    inflight.value = true
    error.value = null

    try {
      const result = await callApi<DashboardResponse>('getPengajuanList', getParams())
      if (requestId.value !== currentRequestId) return

      data.value = result.data ?? {}
      lastKey.value = key
      fetchedAt.value = Date.now()
    } catch (err) {
      if (requestId.value !== currentRequestId) return

      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (requestId.value === currentRequestId) {
        inflight.value = false
      }
    }
  }

  function ensureLoaded() {
    void fetchList(false)
  }

  async function refresh() {
    await fetchList(true)
  }

  function invalidate() {
    fetchedAt.value = 0
  }

  watch(
    () => [invalidations.value.getPengajuanList, invalidations.value['*']],
    () => {
      invalidate()
      if (data.value) void fetchList(true)
    }
  )

  return {
    rows,
    isLoading,
    isRefreshing,
    loadedRows,
    totalRows,
    page,
    pageSize,
    totalPages,
    isFullyLoaded,
    error,
    refresh,
    ensureLoaded,
    invalidate
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
