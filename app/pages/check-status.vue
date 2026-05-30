<script setup lang="ts">
type ToastType = 'info' | 'success' | 'error'

type ApiResult<T = Record<string, unknown>> = {
  success: boolean
  data?: T
  error?: string
}

type StatusData = {
  idPengajuan?: string
  status?: string
}

type ResultType = 'idle' | 'loading' | 'success' | 'error'

type StatusTone = {
  badge: string
  dotPing: string
  dot: string
}

const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

const idPengajuanInput = ref('')
const resultType = ref<ResultType>('idle')
const resultMessage = ref('')
const statusData = ref<StatusData>({})
const isLoading = ref(false)
const hasInputError = ref(false)
const hasStatusInputInteraction = ref(false)
const statusCheckRequestId = ref(0)

const showStatusResult = computed(() => resultType.value !== 'idle')
const statusText = computed(() => statusData.value.status || '-')
const statusTone = computed(() => statusCheckBadge(statusData.value.status))
const statusInfoText = computed(() => statusCheckInfoText(statusData.value.status))

async function callAPI<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  if (!appsScriptApiUrl.value) {
    throw new Error('URL Google Apps Script belum dikonfigurasi.')
  }

  const response = await fetch(appsScriptApiUrl.value, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  })

  if (!response.ok) {
    throw new Error(`Google Apps Script merespons ${response.status}.`)
  }

  return response.json() as Promise<ApiResult<T>>
}

function showToast(message: string, type: ToastType = 'info') {
  const iconMap: Record<ToastType, string> = {
    info: 'i-lucide-info',
    success: 'i-lucide-circle-check',
    error: 'i-lucide-circle-alert'
  }

  toast.add({
    title: message,
    color: type,
    icon: iconMap[type]
  })
}

async function handleCheckStatus() {
  const requestId = ++statusCheckRequestId.value
  const idPengajuan = idPengajuanInput.value.trim()
  hasInputError.value = false
  resetStatusCheckResult()

  if (!idPengajuan) {
    hasInputError.value = true
    showToast('Masukkan ID Pengajuan terlebih dahulu.', 'error')
    return
  }

  setStatusCheckLoading(true)
  showStatusCheckResult('loading', 'Memeriksa status pengajuan...')

  try {
    const result = await callAPI<StatusData>('checkPengajuanStatus', { idPengajuan })
    if (requestId !== statusCheckRequestId.value) return
    if (!result.success) throw new Error(result.error || 'Status pengajuan gagal dimuat')

    renderStatusCheckResult(result.data || { idPengajuan })
  } catch (error) {
    if (requestId === statusCheckRequestId.value) {
      const message = getErrorMessage(error)
      showStatusCheckResult('error', message)
      showToast(message, 'error')
    }
  } finally {
    if (requestId === statusCheckRequestId.value) setStatusCheckLoading(false)
  }
}

function renderStatusCheckResult(data: StatusData) {
  statusData.value = data
  resultMessage.value = ''
  resultType.value = 'success'
}

function showStatusCheckResult(type: Exclude<ResultType, 'idle'>, message: string) {
  statusData.value = {}
  resultMessage.value = message
  resultType.value = type
}

function resetStatusCheckResult() {
  statusData.value = {}
  resultMessage.value = ''
  resultType.value = 'idle'
}

function setStatusCheckLoading(value: boolean) {
  isLoading.value = value
}

function clearInputError() {
  hasInputError.value = false
}

function statusCheckBadge(status?: string): StatusTone {
  const map: Record<string, StatusTone> = {
    'Menunggu Upload': {
      badge: 'border-amber-200 bg-amber-100',
      dotPing: 'bg-amber-500',
      dot: 'bg-amber-600'
    },
    Baru: {
      badge: 'border-blue-200 bg-blue-100',
      dotPing: 'bg-blue-500',
      dot: 'bg-blue-600'
    },
    Disetujui: {
      badge: 'border-green-200 bg-green-100',
      dotPing: 'bg-green-500',
      dot: 'bg-green-600'
    },
    Ditolak: {
      badge: 'border-red-200 bg-red-100',
      dotPing: 'bg-red-500',
      dot: 'bg-red-600'
    },
    Selesai: {
      badge: 'border-slate-300 bg-slate-200',
      dotPing: 'bg-slate-500',
      dot: 'bg-slate-600'
    }
  }

  return map[status || ''] || {
    badge: 'border-slate-200 bg-slate-100',
    dotPing: 'bg-slate-500',
    dot: 'bg-slate-600'
  }
}

function statusTextClass(status?: string) {
  const map: Record<string, string> = {
    'Menunggu Upload': 'text-amber-800',
    Baru: 'text-blue-700',
    Disetujui: 'text-green-700',
    Ditolak: 'text-red-700',
    Selesai: 'text-slate-800'
  }

  return map[status || ''] || 'text-slate-700'
}

function statusCheckInfoText(status?: string) {
  const map: Record<string, string> = {
    Baru: 'Pengajuan sudah diterima dan sedang menunggu proses pengecekan admin.',
    Disetujui: 'Pengajuan telah diperiksa dan disetujui dan akan dibuatkan dan langsung dikirimkan.',
    Ditolak: 'Pengajuan telah diperiksa dan ditolak, silakan hubungi admin untuk informasi lebih lanjut.',
    Selesai: 'Kartu sudah selesai dibuat dan dikirimkan ke alamat yang tertera di pengajuan.',
    'Menunggu Upload': 'Pengajuan masih berupa draft. Lanjutkan draft untuk upload hard copy bertanda tangan dan submit final.'
  }

  return map[status || ''] || 'Status pengajuan berhasil ditemukan.'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <section class="mx-auto flex min-h-full w-full max-w-5xl flex-col p-4 md:p-8">
    <!-- Workspace Header -->

    <!-- TARGET CONTENT CONTAINER -->
    <div
      class="mb-8 grow rounded-3xl border border-white/60 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-colors md:p-8"
      :class="hasStatusInputInteraction ? 'bg-white/65' : 'bg-white/45'"
    >
      <div class="mx-auto max-w-md py-6 text-center">
        <h2 class="mb-2 text-xl font-bold text-slate-900 md:text-2xl">
          Lacak Status Pengajuan
        </h2>
        <p class="mb-6 text-sm text-slate-500">
          Masukkan ID Pengajuan Anda untuk melihat progres dokumen terbaru.
        </p>

        <form class="space-y-4" @submit.prevent="handleCheckStatus">
          <div class="flex flex-col gap-2 md:flex-row">
            <UInput
              v-model="idPengajuanInput"
              type="text"
              class="w-full md:flex-1"
              size="xl"
              color="neutral"
              variant="outline"
              :highlight="hasInputError"
              :ui="{ base: 'rounded-xl bg-default px-4 py-3 font-mono uppercase' }"
              placeholder="KG-YYYYMMDD-XXXX"
              autocomplete="off"
              @focusin="hasStatusInputInteraction = true"
              @focusout="hasStatusInputInteraction = false"
              @update:model-value="clearInputError"
            />
            <UButton
              type="submit"
              class="w-full justify-center rounded-xl px-6 py-3 md:w-auto"
              color="neutral"
              variant="solid"
              size="xl"
              icon="i-lucide-search"
              :label="isLoading ? 'Mencari...' : 'Cari'"
              :loading="isLoading"
              :disabled="isLoading"
            />
          </div>

          <!-- Hasil Pencarian -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="translate-y-2 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
          >
            <div v-if="showStatusResult" class="mt-8 rounded-2xl border bg-slate-50 p-6 text-center">
              <template v-if="resultType === 'success'">
                <span class="mb-4 block text-xs font-bold uppercase tracking-widest text-slate-400">Hasil Pencarian</span>
                <h3 class="mb-6 break-all font-mono text-2xl font-black text-slate-800">
                  {{ statusData.idPengajuan || idPengajuanInput || '-' }}
                </h3>

                <div class="mb-4 inline-flex items-center justify-center gap-3 rounded-full border px-6 py-2 shadow-sm" :class="statusTone.badge">
                  <span class="relative flex h-2.5 w-2.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" :class="statusTone.dotPing" />
                    <span class="relative inline-flex h-2.5 w-2.5 rounded-full" :class="statusTone.dot" />
                  </span>
                  <span class="text-sm font-bold tracking-wide" :class="statusTextClass(statusData.status)">{{ statusText }}</span>
                </div>

                <p class="mt-2 text-sm font-medium text-slate-600">
                  {{ statusInfoText }}
                </p>
              </template>

              <p
                v-else
                class="text-sm font-semibold"
                :class="resultType === 'loading' ? 'text-blue-700' : 'text-red-700'"
              >
                {{ resultMessage }}
              </p>
            </div>
          </Transition>
        </form>
      </div>
    </div>
  </section>
</template>
