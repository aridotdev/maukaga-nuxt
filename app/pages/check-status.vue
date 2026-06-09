<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'cs'
})


type ToastType = 'info' | 'success' | 'error'

type ApiResult<T = Record<string, unknown>> = {
  success: boolean
  data?: T
  error?: string
}

type StatusData = {
  idPengajuan?: string
  searchBy?: 'idPengajuan' | 'nomorSeri'
  status?: string
  parentStatus?: string
  statusItem?: string
  noItem?: string | number
  nomorSeri?: string
  produk?: string
  model?: string
}

type ResultType = 'idle' | 'loading' | 'success' | 'error'

type StatusTone = {
  badge: string
  dotPing: string
  dot: string
  icon: string
  iconColor: string
}

const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

const searchInput = ref('')
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
const itemProductText = computed(() => [statusData.value.produk, statusData.value.model].filter(Boolean).join(' - '))

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
  const keyword = searchInput.value.trim()
  hasInputError.value = false
  resetStatusCheckResult()

  if (!keyword) {
    hasInputError.value = true
    showToast('Masukkan ID Pengajuan atau Nomor Seri terlebih dahulu.', 'error')
    return
  }

  setStatusCheckLoading(true)
  showStatusCheckResult('loading', 'Memeriksa status pengajuan...')

  try {
    const result = await callAPI<StatusData>('checkPengajuanStatus', { keyword })
    if (requestId !== statusCheckRequestId.value) return
    if (!result.success) throw new Error(result.error || 'Status pengajuan atau nomor seri gagal dimuat')

    renderStatusCheckResult(result.data || {})
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
      badge: 'border-amber-200 bg-amber-100/70 text-amber-800',
      dotPing: 'bg-amber-500',
      dot: 'bg-amber-600',
      icon: 'i-lucide-clock-3',
      iconColor: 'text-amber-500 bg-amber-100'
    },
    Baru: {
      badge: 'border-blue-200 bg-blue-100/70 text-blue-700',
      dotPing: 'bg-blue-500',
      dot: 'bg-blue-600',
      icon: 'i-lucide-sparkles',
      iconColor: 'text-blue-500 bg-blue-100'
    },
    Disetujui: {
      badge: 'border-green-200 bg-green-100/70 text-green-700',
      dotPing: 'bg-green-500',
      dot: 'bg-green-600',
      icon: 'i-lucide-check-circle-2',
      iconColor: 'text-green-500 bg-green-100'
    },
    Ditolak: {
      badge: 'border-red-200 bg-red-100/70 text-red-700',
      dotPing: 'bg-red-500',
      dot: 'bg-red-600',
      icon: 'i-lucide-x-octagon',
      iconColor: 'text-red-500 bg-red-100'
    },
    Selesai: {
      badge: 'border-slate-300 bg-slate-200/70 text-slate-800',
      dotPing: 'bg-slate-500',
      dot: 'bg-slate-600',
      icon: 'i-lucide-package-check',
      iconColor: 'text-slate-600 bg-slate-200'
    }
  }

  return map[status || ''] || {
    badge: 'border-slate-200 bg-slate-100/70 text-slate-700',
    dotPing: 'bg-slate-500',
    dot: 'bg-slate-600',
    icon: 'i-lucide-search-code',
    iconColor: 'text-slate-500 bg-slate-100'
  }
}

function statusCheckInfoText(status?: string) {
  const map: Record<string, string> = {
    Baru: 'Pengajuan sudah diterima dan sedang menunggu proses pengecekan admin.',
    Disetujui: 'Pengajuan telah diperiksa dan disetujui. Kartu garansi akan segera dibuat dan dikirimkan.',
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
  <section class="mx-auto flex min-h-full w-full max-w-4xl flex-col p-4 md:p-8">
    <div
      class="mb-8 grow rounded-3xl border border-white/60 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-all duration-500 md:p-8"
      :class="hasStatusInputInteraction ? 'bg-white/65 scale-[1.01] shadow-xl' : 'bg-white/45'"
    >
      <div class="mx-auto max-w-xl py-6 text-center">
        <div class="mb-4 inline-flex items-center justify-center rounded-2xl bg-blue-100 p-3 text-blue-600">
          <UIcon name="i-lucide-radar" class="size-8" />
        </div>
        <h2 class="mb-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Lacak Status Pengajuan
        </h2>
        <p class="mb-8 text-sm text-slate-500">
          Masukkan ID Pengajuan atau Nomor Seri untuk melihat progres dokumen terbaru secara real-time.
        </p>

        <form class="space-y-6" @submit.prevent="handleCheckStatus">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <UInput
              v-model="searchInput"
              type="text"
              class="w-full md:flex-1"
              size="xl"
              color="neutral"
              variant="outline"
              :highlight="hasInputError"
              :ui="{ base: 'rounded-xl bg-white/80 px-4 py-3.5 font-mono shadow-inner transition-colors focus:bg-white' }"
              placeholder="Contoh: KG-YYYYMMDD-XXXX atau SN123456"
              autocomplete="off"
              @focusin="hasStatusInputInteraction = true"
              @focusout="hasStatusInputInteraction = false"
              @update:model-value="clearInputError"
            />
            <UButton
              type="submit"
              class="w-full justify-center rounded-xl px-8 py-3.5 font-semibold shadow-md transition-all active:scale-95 md:w-auto"
              color="primary"
              variant="solid"
              size="xl"
              icon="i-lucide-search"
              :label="isLoading ? 'Mencari...' : 'Cari Status'"
              :loading="isLoading"
              :disabled="isLoading"
            />
          </div>

          <!-- HASIL PENCARIAN -->
          <Transition name="slide-fade">
            <div v-if="showStatusResult" class="mt-8 relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-6 text-center shadow-sm backdrop-blur-md">
              
              <!-- Dekorasi Background sesuai status -->
              <div 
                v-if="resultType === 'success'"
                class="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl transition-colors duration-1000" 
                :class="statusTone.dotPing"
              />

              <div class="relative z-10">
                <template v-if="resultType === 'success'">
                  <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full" :class="statusTone.iconColor">
                    <UIcon :name="statusTone.icon" class="size-7" />
                  </div>
                  
                  <span class="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Hasil Pencarian</span>
                  <h3 class="mb-4 break-all font-mono text-2xl font-black text-slate-800">
                    {{ statusData.idPengajuan || searchInput || '-' }}
                  </h3>

                  <div v-if="statusData.nomorSeri" class="mx-auto mb-4 grid max-w-sm gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left text-xs text-slate-500">
                    <div class="flex items-center justify-between gap-3">
                      <span>Nomor Seri</span>
                      <span class="break-all font-mono font-semibold text-slate-700">{{ statusData.nomorSeri }}</span>
                    </div>
                    <div v-if="itemProductText" class="flex items-center justify-between gap-3">
                      <span>Produk</span>
                      <span class="text-right font-semibold text-slate-700">{{ itemProductText }}</span>
                    </div>
                    <div v-if="statusData.noItem" class="flex items-center justify-between gap-3">
                      <span>No Item</span>
                      <span class="font-semibold text-slate-700">#{{ statusData.noItem }}</span>
                    </div>
                  </div>

                  <div class="mb-5 inline-flex items-center justify-center gap-2.5 rounded-full border px-5 py-2 shadow-sm backdrop-blur-sm" :class="statusTone.badge">
                    <span class="relative flex size-2.5">
                      <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" :class="statusTone.dotPing" />
                      <span class="relative inline-flex size-2.5 rounded-full" :class="statusTone.dot" />
                    </span>
                    <span class="text-sm font-bold tracking-wide">{{ statusText }}</span>
                  </div>

                  <div class="mx-auto max-w-sm rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                    <p class="text-sm font-medium leading-relaxed text-slate-600">
                      {{ statusInfoText }}
                    </p>
                  </div>
                </template>

                <div v-else class="flex flex-col items-center justify-center py-6">
                  <UIcon 
                    :name="resultType === 'loading' ? 'i-lucide-loader-2' : 'i-lucide-file-warning'" 
                    class="mb-3 size-10" 
                    :class="[resultType === 'loading' ? 'animate-spin text-blue-500' : 'text-red-500']"
                  />
                  <p
                    class="text-sm font-semibold"
                    :class="resultType === 'loading' ? 'text-blue-700' : 'text-red-700'"
                  >
                    {{ resultMessage }}
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Animasi Slide Fade untuk Hasil Pencarian */
.slide-fade-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.2);
}
.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}
.slide-fade-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateY(10px);
  opacity: 0;
}
</style>
