import type { H3Event } from 'h3'
import { clean } from './normalizers'
import type { DetailMutationResponse } from './types'

type PengajuanMutationSession = {
  token: string
  role: string
}

type PengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Selesai'
type ItemDecisionStatus = 'Disetujui' | 'Ditolak' | ''

const PENGAJUAN_STATUSES: ReadonlySet<PengajuanStatus> = new Set([
  'Baru',
  'Disetujui',
  'Ditolak',
  'Diprint',
  'Dikirim',
  'Selesai'
])
const ITEM_DECISION_STATUSES: ReadonlySet<ItemDecisionStatus> = new Set([
  '',
  'Disetujui',
  'Ditolak'
])
const PENGAJUAN_MUTATION_ROLES = new Set(['admin', 'qrcc'])

export function getRequiredPengajuanId(event: H3Event) {
  const idPengajuan = clean(getRouterParam(event, 'id'))

  if (!idPengajuan) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID Pengajuan tidak valid.'
    })
  }

  return idPengajuan
}

export async function updatePengajuanItemDecision(
  session: PengajuanMutationSession,
  idPengajuan: string,
  body: Record<string, unknown>
) {
  assertCanMutatePengajuan(session)

  const noItem = clean(body.noItem)
  const hasDecisionPayload = Object.prototype.hasOwnProperty.call(body, 'keputusanItem')
  const keputusanItem = normalizeItemDecision(body.keputusanItem)
  const catatanAdmin = clean(body.catatanAdmin)

  if (!noItem) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No Item wajib diisi.'
    })
  }

  if (!hasDecisionPayload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keputusan item wajib diisi.'
    })
  }

  if (keputusanItem === 'Ditolak' && !catatanAdmin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Catatan Admin wajib diisi jika keputusan Ditolak.'
    })
  }

  return mutatePengajuanInSource(session, 'updateItemDecision', idPengajuan, {
    noItem,
    keputusanItem,
    catatanAdmin
  })
}

export async function updatePengajuanStatus(
  session: PengajuanMutationSession,
  idPengajuan: string,
  body: Record<string, unknown>
) {
  assertCanMutatePengajuan(session)

  const statusBaru = normalizePengajuanStatus(body.statusBaru)
  const catatanAdmin = clean(body.catatanAdmin)

  return mutatePengajuanInSource(session, 'updateStatus', idPengajuan, {
    statusBaru,
    catatanAdmin
  })
}

function assertCanMutatePengajuan(session: PengajuanMutationSession) {
  if (PENGAJUAN_MUTATION_ROLES.has(session.role)) return

  throw createError({
    statusCode: 403,
    statusMessage: 'Unauthorized: role tidak boleh mengubah pengajuan.'
  })
}

function normalizePengajuanStatus(value: unknown): PengajuanStatus {
  const status = clean(value)

  if (PENGAJUAN_STATUSES.has(status as PengajuanStatus)) {
    return status as PengajuanStatus
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Status pengajuan tidak valid.'
  })
}

function normalizeItemDecision(value: unknown): ItemDecisionStatus {
  const decision = clean(value)

  if (ITEM_DECISION_STATUSES.has(decision as ItemDecisionStatus)) {
    return decision as ItemDecisionStatus
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Keputusan item tidak valid.'
  })
}

async function mutatePengajuanInSource(
  session: PengajuanMutationSession,
  action: 'updateItemDecision' | 'updateStatus',
  idPengajuan: string,
  payload: Record<string, unknown>
) {
  const result = await callAppsScriptMutation(session.token, action, {
    idPengajuan,
    ...payload
  })
  const data = result.data || {}

  await refreshPengajuanCache(session.token, idPengajuan, data)

  return data
}

async function callAppsScriptMutation(
  token: string,
  action: 'updateItemDecision' | 'updateStatus',
  payload: Record<string, unknown>
) {
  try {
    const result = await callAdminAppsScript<DetailMutationResponse>(token, action, payload)

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: result.error || 'Mutasi pengajuan gagal.'
      })
    }

    return result
  } catch (error) {
    if (isH3Error(error)) throw error

    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : String(error)
    })
  }
}

async function refreshPengajuanCache(
  token: string,
  idPengajuan: string,
  data: DetailMutationResponse
) {
  try {
    if (data.detail?.idPengajuan) {
      await upsertPengajuanRowsToCache([data.detail], { detail: true })
      return
    }

    await syncAdminCache({ token, mode: 'detail', idPengajuan })
  } catch (error) {
    console.error('[admin-cache] Gagal memperbarui cache detail pengajuan setelah mutasi.', error)
    triggerAdminCacheSync({ token, mode: 'detail', idPengajuan })
  }
}

function isH3Error(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'statusCode' in error
  )
}
