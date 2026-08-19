import { asRecord, clean } from './normalizers'
import type { DashboardResponse, DetailPengajuan } from './types'

type SyncMode = 'full' | 'background' | 'changed' | 'detail' | 'delete'

type SyncOptions = {
  token: string
  mode?: SyncMode
  idPengajuan?: string
}

type ApiResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

const PAGE_SIZE = 100
const STALE_AFTER_MS = 30_000
let syncPromise: Promise<Awaited<ReturnType<typeof getAdminCacheStatus>>> | null = null

export async function isAdminCacheStale() {
  const status = await getAdminCacheStatus()
  if (!status.lastSuccessAt) return true

  const lastSuccess = new Date(status.lastSuccessAt).getTime()
  return !Number.isFinite(lastSuccess) || Date.now() - lastSuccess > STALE_AFTER_MS
}

export async function ensureAdminCacheWarm(token: string) {
  if (await countPengajuanRows() > 0) {
    if (await isAdminCacheStale()) triggerAdminCacheSync({ token, mode: 'background' })
    return
  }

  try {
    await syncAdminCache({ token, mode: 'full' })
  } catch {
    await setAdminCacheMeta({ sync_in_progress: false })
  }
}

export function triggerAdminCacheSync(options: SyncOptions) {
  if (syncPromise) return syncPromise

  syncPromise = syncAdminCache(options).finally(() => {
    syncPromise = null
  })

  return syncPromise
}

export async function syncAdminCache(options: SyncOptions) {
  if (options.mode === 'delete' && options.idPengajuan) {
    await deletePengajuanFromCache(options.idPengajuan)
    return getAdminCacheStatus()
  }

  if (options.mode === 'detail' || options.mode === 'changed') {
    if (options.idPengajuan) await syncPengajuanDetail(options.token, options.idPengajuan)
    else triggerAdminCacheSync({ token: options.token, mode: 'background' })
    return getAdminCacheStatus()
  }

  const startedAt = new Date().toISOString()
  await setAdminCacheMeta({
    sync_in_progress: true,
    last_started_at: startedAt,
    last_error_message: ''
  })

  try {
    const rows = await fetchAllPengajuanRows(options.token)
    const changed = await upsertPengajuanRowsToCache(rows)
    const ids = rows.map(row => clean(asRecord(row).idPengajuan)).filter(Boolean)

    if (options.mode === 'full') {
      await reconcilePengajuanCache(ids)
    }

    await setAdminCacheMeta({
      sync_in_progress: false,
      last_success_at: new Date().toISOString(),
      last_row_count: ids.length
    })

    return {
      ...(await getAdminCacheStatus()),
      rowsChanged: changed
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await setAdminCacheMeta({
      sync_in_progress: false,
      last_error_at: new Date().toISOString(),
      last_error_message: message
    })
    throw error
  }
}

async function syncPengajuanDetail(token: string, idPengajuan: string) {
  const result = await callAppsScript<DetailPengajuan>(token, 'getDetail', { idPengajuan })
  const detail = result.data

  if (!result.success || !detail) {
    throw new Error(result.error || 'Gagal sync detail pengajuan.')
  }

  await upsertPengajuanRowsToCache([detail], { detail: true })
  await setAdminCacheMeta({
    last_success_at: new Date().toISOString(),
    last_error_message: ''
  })
}

async function fetchAllPengajuanRows(token: string) {
  const first = await callAppsScript<DashboardResponse>(token, 'getPengajuanList', {
    page: 1,
    pageSize: PAGE_SIZE,
    itemDecision: 'all',
    sortBy: 'timestampSubmit',
    sortDirection: 'desc'
  })

  if (!first.success) throw new Error(first.error || 'Gagal sync daftar pengajuan.')

  const firstData = first.data || {}
  const pageSize = Number(firstData.pageSize || PAGE_SIZE)
  const totalRows = Number(firstData.totalRows || firstData.rows?.length || 0)
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1)
  const rows = [...(firstData.rows || [])]

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await callAppsScript<DashboardResponse>(token, 'getPengajuanList', {
      page,
      pageSize,
      itemDecision: 'all',
      sortBy: 'timestampSubmit',
      sortDirection: 'desc'
    })

    if (!next.success) throw new Error(next.error || `Gagal sync daftar pengajuan halaman ${page}.`)
    rows.push(...(next.data?.rows || []))
  }

  return rows
}

async function callAppsScript<T>(token: string, action: string, payload: Record<string, unknown> = {}) {
  const config = useRuntimeConfig()
  const url = clean(config.appsScriptApiUrl || config.public.appsScriptApiUrl)

  if (!url) throw new Error('URL Google Apps Script belum dikonfigurasi.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        token,
        ...payload
      }),
      signal: controller.signal
    })
    const text = await response.text()
    const json = text ? JSON.parse(text) as ApiResult<T> : { success: false, error: 'Response kosong.' }

    if (!response.ok) {
      throw new Error(json.error || `Google Apps Script merespons ${response.status}.`)
    }

    return json
  } finally {
    clearTimeout(timeout)
  }
}
