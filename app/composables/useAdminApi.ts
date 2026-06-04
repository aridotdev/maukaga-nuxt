export function useAdminApi() {
  const supabase = useSupabaseClient()
  const runtimeConfig = useRuntimeConfig()
  const gasUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

  async function callAdminAction<T>(
    action: string,
    payload: Record<string, unknown> = {}
  ) {
    if (!gasUrl.value) {
      throw new Error('URL Google Apps Script belum dikonfigurasi.')
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('Tidak ada session aktif.')

    const response = await fetch(gasUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        token: data.session.access_token,
        ...payload
      })
    })

    if (!response.ok) {
      throw new Error(`Google Apps Script merespons ${response.status}.`)
    }

    const result = await response.json() as {
      success: boolean
      data?: T
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Request gagal.')
    }

    return result.data as T
  }

  return { callAdminAction }
}
