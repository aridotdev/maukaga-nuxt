type AdminCacheQueryKey = string

type AdminCacheEntry<T> = {
  data: T | null
  error: string | null
  fetchedAt: number
  inflight: Promise<T | null> | null
}

const DEFAULT_ADMIN_CACHE_TTL = 30_000

function stableAdminCacheStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableAdminCacheStringify).join(',') + ']'

  const record = value as Record<string, unknown>
  return '{' + Object.keys(record)
    .sort()
    .map(key => JSON.stringify(key) + ':' + stableAdminCacheStringify(record[key]))
    .join(',') + '}'
}

function buildAdminCacheKey(path: string, params: Record<string, unknown>) {
  return path + '::' + stableAdminCacheStringify(params)
}

export function useAdminCacheApi() {
  const { getSession } = useCurrentSession()

  async function getAuthHeaders() {
    const session = await getSession()
    if (!session) throw new Error('Tidak ada session aktif.')

    return {
      Authorization: `Bearer ${session.access_token}`
    }
  }

  async function callAdminCache<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST'
      query?: Record<string, unknown>
      body?: Record<string, unknown>
    } = {}
  ) {
    const headers = await getAuthHeaders()

    const response = await $fetch(path, {
      method: options.method || 'GET',
      headers,
      query: options.query,
      body: options.body
    })

    return response as T
  }

  return {
    callAdminCache
  }
}

export function useAdminCacheQuery<T = unknown>(
  path: string,
  params: Record<string, unknown> = {},
  options: { ttl?: number } = {}
) {
  const { callAdminCache } = useAdminCacheApi()
  const ttl = options.ttl ?? DEFAULT_ADMIN_CACHE_TTL
  const key = buildAdminCacheKey(path, params)
  const store = useState<Record<AdminCacheQueryKey, AdminCacheEntry<unknown>>>('admin-cache-query-store', () => ({}))

  if (!store.value[key]) {
    store.value[key] = {
      data: null,
      error: null,
      fetchedAt: 0,
      inflight: null
    }
  }

  const entry = store.value[key] as AdminCacheEntry<T>
  const data = computed(() => entry.data)
  const error = computed(() => entry.error)
  const isLoading = computed(() => entry.inflight !== null && entry.data === null)
  const isRefreshing = computed(() => entry.inflight !== null && entry.data !== null)

  function isFresh() {
    return entry.fetchedAt > 0 && Date.now() - entry.fetchedAt < ttl
  }

  async function fetchOnce(force = false) {
    if (!force && isFresh() && entry.data !== null) return entry.data
    if (entry.inflight) return entry.inflight

    const promise = callAdminCache<T>(path, { query: params })
      .then((result) => {
        entry.data = result
        entry.error = null
        return result
      })
      .catch((err: unknown) => {
        entry.error = err instanceof Error ? err.message : String(err)
        return null
      })
      .finally(() => {
        entry.inflight = null
        entry.fetchedAt = Date.now()
      })

    entry.inflight = promise
    return promise
  }

  async function refresh() {
    await fetchOnce(true)
  }

  function ensureLoaded() {
    if (entry.inflight) return
    if (isFresh() && entry.data !== null) return
    void fetchOnce(false)
  }

  function invalidate() {
    entry.fetchedAt = 0
  }

  function mutate(updater: (current: T | null) => T | null) {
    entry.data = updater(entry.data)
  }

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refresh,
    ensureLoaded,
    invalidate,
    mutate
  }
}

export function useAdminCacheSync() {
  const { callAdminCache } = useAdminCacheApi()

  async function triggerSync(body: Record<string, unknown> = {}) {
    return await callAdminCache('/api/admin-cache/sync', {
      method: 'POST',
      body
    })
  }

  async function syncDetail(idPengajuan: string) {
    return await triggerSync({ mode: 'detail', idPengajuan })
  }

  async function deleteLocal(idPengajuan: string) {
    return await triggerSync({ mode: 'delete', idPengajuan })
  }

  return {
    triggerSync,
    syncDetail,
    deleteLocal
  }
}

export function useAdminCacheSyncStatus() {
  const { callAdminCache } = useAdminCacheApi()
  const status = useState<{
    status: string
    inProgress: boolean
    lastStartedAt: string
    lastSuccessAt: string
    lastErrorAt: string
    lastErrorMessage: string
    lastRowCount: number
    totalRows: number
  } | null>('admin-cache-sync-status', () => null)
  const isLoading = ref(false)
  const error = ref('')

  async function refreshStatus() {
    isLoading.value = true
    error.value = ''

    try {
      status.value = await callAdminCache<typeof status.value>('/api/admin-cache/sync-status')
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isLoading.value = false
    }
  }

  async function syncNow() {
    isLoading.value = true
    error.value = ''

    try {
      status.value = await callAdminCache<typeof status.value>('/api/admin-cache/sync', {
        method: 'POST',
        body: { mode: 'full' }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    status,
    isLoading,
    error,
    refreshStatus,
    syncNow
  }
}
