import type { ApiResult } from '~/types/print'

export function useAppsScriptApi() {
  const runtimeConfig = useRuntimeConfig()
  const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

  async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
    if (!appsScriptApiUrl.value) {
      throw new Error('URL Google Apps Script belum dikonfigurasi.')
    }

    const token = sessionStorage.getItem('admin_token')
    if (!token) throw new Error('Unauthorized')

    const response = await fetch(appsScriptApiUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        token,
        ...payload
      })
    })

    if (!response.ok) throw new Error(`Google Apps Script merespons ${response.status}.`)

    return response.json() as Promise<ApiResult<T>>
  }

  return {
    appsScriptApiUrl,
    callApi
  }
}
