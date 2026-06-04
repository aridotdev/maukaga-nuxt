type AppsScriptResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

const allowedAdminActions = new Set([
  'adminUsersList',
  'adminUsersInvite',
  'adminUsersUpdate',
  'adminUsersDeactivate',
  'adminUsersReactivate'
])

export default defineEventHandler(async (event): Promise<AppsScriptResult> => {
  const config = useRuntimeConfig(event)
  const appsScriptApiUrl = String(config.appsScriptApiUrl || config.public.appsScriptApiUrl || '')

  if (!appsScriptApiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'URL Google Apps Script belum dikonfigurasi.'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const action = typeof body?.action === 'string' ? body.action : ''
  const token = typeof body?.token === 'string' ? body.token : ''

  if (!allowedAdminActions.has(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Action admin tidak valid.'
    })
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Tidak ada session aktif.'
    })
  }

  const response = await fetch(appsScriptApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      ...body,
      action,
      token
    })
  })

  const text = await response.text()
  let result: AppsScriptResult | null = null

  if (text) {
    try {
      result = JSON.parse(text) as AppsScriptResult
    } catch {
      throw createError({
        statusCode: 502,
        statusMessage: 'Respons Google Apps Script tidak valid.'
      })
    }
  }

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Google Apps Script merespons ${response.status}.`
    })
  }

  return result || { success: false, error: 'Respons Google Apps Script kosong.' }
})
