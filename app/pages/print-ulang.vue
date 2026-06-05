<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'cs'
})

type ToastColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

type ApiResult<T = Record<string, unknown>> = {
  success: boolean
  data?: T
  error?: string
}

type DraftItem = {
  produk?: string
  model?: string
  nomorSeri?: string
}

type DraftData = {
  idPengajuan?: string
  status?: string
  nama?: string
  bagianCabang?: string
  pemilik?: string
  alasanPengajuan?: string
  tanggalForm?: string
  catatanTambahan?: string
  items?: DraftItem[]
}

type DraftStatusResponse = {
  idPengajuan?: string
  status?: string
  resumeToken?: string
}

type StoredDraftReference = {
  idPengajuan: string
  resumeToken: string
}

type LoadDraftReference = Partial<StoredDraftReference> & {
  fromUrl?: boolean
  source?: 'manual' | 'stored' | 'url'
}

type PrintRow = {
  label: string
  value: string
}

const toast = useToast()
const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const draftStorageKey = 'pengajuan_kartu_garansi_draft'
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

const searchId = ref('')
const currentDraftId = ref('')
const currentResumeToken = ref('')
const loadedDraft = ref<DraftData | null>(null)
const hasSearchInputError = ref(false)
const isLoadingDraft = ref(false)
const isLoadingStoredDraft = ref(false)
const showPrintPreview = ref(false)

const isDraftReady = computed(() => !!currentDraftId.value && !!currentResumeToken.value && !!loadedDraft.value)
const printPayload = computed(() => loadedDraft.value || {})
const printId = computed(() => currentDraftId.value || '-')
const printTanggalForm = computed(() => formatDate(printPayload.value.tanggalForm || ''))
const printMetadataRows = computed<PrintRow[]>(() => {
  const payload = printPayload.value
  const rows: PrintRow[] = [
    { label: 'ID Pengajuan', value: printId.value },
    { label: 'Nama', value: payload.nama || '' },
    { label: 'Bagian/Cabang', value: payload.bagianCabang || '' },
    { label: 'Pemilik', value: payload.pemilik || '' },
    { label: 'Alasan Pengajuan', value: payload.alasanPengajuan || '' },
    { label: 'Catatan Tambahan', value: payload.catatanTambahan || '-' }
  ]

  if (payload.items?.length === 1) {
    rows.push(
      { label: 'Produk', value: payload.items[0]?.produk || '' },
      { label: 'Model', value: payload.items[0]?.model || '' },
      { label: 'Nomor Seri', value: payload.items[0]?.nomorSeri || '' }
    )
  }

  return rows
})
const printHasMultipleItems = computed(() => (printPayload.value.items?.length || 0) > 1)

onMounted(() => {
  initializeDraftResume()
})

watch(searchId, () => {
  hasSearchInputError.value = false
})

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

function showToast(title: string, color: ToastColor = 'info', description?: string) {
  toast.add({ title, description, color })
}

function initializeDraftResume() {
  const fromUrl = getDraftReferenceFromUrl()
  if (fromUrl.idPengajuan && fromUrl.resumeToken) {
    searchId.value = fromUrl.idPengajuan
    void handleLoadDraft({ ...fromUrl, fromUrl: true, source: 'url' })
  }
}

async function handleLoadDraft(reference: LoadDraftReference = {}) {
  let idPengajuan = String(reference.idPengajuan || searchId.value || '').trim()
  let resumeToken = String(reference.resumeToken || '').trim()
  const saved = getStoredDraftReference()

  if (!resumeToken && saved.idPengajuan === idPengajuan) resumeToken = saved.resumeToken

  if (!idPengajuan) {
    hasSearchInputError.value = true
    showToast('Masukkan ID Pengajuan, klik Draft Terakhir, atau buka Link Pengajuan.', 'error')
    return
  }

  const loadingState = reference.source === 'stored' ? isLoadingStoredDraft : isLoadingDraft
  loadingState.value = true
  hasSearchInputError.value = false
  showPrintPreview.value = false

  try {
    if (!resumeToken) {
      const statusResult = await callAPI<DraftStatusResponse>('checkDraftPengajuanStatus', { idPengajuan })
      if (!statusResult.success) throw new Error(statusResult.error || 'ID Pengajuan tidak bisa dimuat.')

      resumeToken = String(statusResult.data?.resumeToken || '').trim()
      if (!resumeToken) throw new Error('Pengajuan ditemukan, tetapi Resume Token tidak tersedia.')
    }

    const result = await callAPI<DraftData>('getDraftPengajuan', { idPengajuan, resumeToken })
    if (!result.success) throw new Error(result.error || 'Pengajuan gagal dimuat')

    idPengajuan = result.data?.idPengajuan || idPengajuan
    loadedDraft.value = normalizeDraftData(result.data || {}, idPengajuan)
    setDraftReference(idPengajuan, resumeToken)

    if (reference.fromUrl) clearResumeParamsFromUrl()

    showToast('Pengajuan berhasil dimuat', 'success', `ID Pengajuan: ${idPengajuan} siap dicetak ulang.`)
  } catch (error) {
    loadedDraft.value = null
    currentDraftId.value = ''
    currentResumeToken.value = ''
    showToast('Pengajuan gagal dimuat', 'error', getErrorMessage(error))
  } finally {
    loadingState.value = false
  }
}

function handleLoadStoredDraft() {
  const saved = getStoredDraftReference()
  if (!saved.idPengajuan || !saved.resumeToken) {
    showToast('Belum ada pengajuan terakhir di browser ini. Buka Link Pengajuan jika memakai perangkat lain.', 'error')
    return
  }

  searchId.value = saved.idPengajuan
  void handleLoadDraft({ ...saved, source: 'stored' })
}

function handleReviewPrint() {
  if (!isDraftReady.value) {
    showToast('Data pengajuan belum dimuat. Cari ID Pengajuan terlebih dahulu.', 'error')
    return
  }
  showPrintPreview.value = true
}

function backToForm() {
  showPrintPreview.value = false
}

function printDraft() {
  window.print()
}

function setDraftReference(idPengajuan: string, resumeToken: string) {
  currentDraftId.value = idPengajuan || ''
  currentResumeToken.value = resumeToken || ''
  searchId.value = currentDraftId.value

  if (!import.meta.client || !currentDraftId.value) return

  try {
    localStorage.setItem(draftStorageKey, JSON.stringify({
      idPengajuan: currentDraftId.value,
      resumeToken: currentResumeToken.value,
      savedAt: new Date().toISOString()
    }))
  } catch {
    // localStorage may be unavailable; reference still works in current session.
  }
}

function getStoredDraftReference(): StoredDraftReference {
  if (!import.meta.client) return { idPengajuan: '', resumeToken: '' }

  try {
    const saved = JSON.parse(localStorage.getItem(draftStorageKey) || '{}') as Partial<StoredDraftReference>
    return { idPengajuan: saved.idPengajuan || '', resumeToken: saved.resumeToken || '' }
  } catch {
    return { idPengajuan: '', resumeToken: '' }
  }
}

function getDraftReferenceFromUrl(): StoredDraftReference {
  return {
    idPengajuan: getQueryValue(route.query.id) || getQueryValue(route.query.idPengajuan),
    resumeToken: getQueryValue(route.query.token) || getQueryValue(route.query.resumeToken)
  }
}

function clearResumeParamsFromUrl() {
  const query = { ...route.query }
  delete query.id
  delete query.idPengajuan
  delete query.token
  delete query.resumeToken
  void router.replace({ path: route.path, query })
}

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

function normalizeDraftData(data: DraftData, fallbackId: string): DraftData {
  return {
    idPengajuan: data.idPengajuan || fallbackId,
    status: data.status || '',
    nama: data.nama || '',
    bagianCabang: data.bagianCabang || '',
    pemilik: data.pemilik || '',
    alasanPengajuan: data.alasanPengajuan || '',
    tanggalForm: data.tanggalForm || '',
    catatanTambahan: data.catatanTambahan || '',
    items: (data.items || []).map(item => ({
      produk: item.produk || '',
      model: item.model || '',
      nomorSeri: item.nomorSeri || ''
    }))
  }
}

function formatDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID') : '-'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <section class="mx-auto flex min-h-full w-full max-w-4xl flex-col p-4 md:p-8">
    <Transition name="layout" mode="out-in">
      <!-- STATE: FORM CARI -->
      <div v-if="!showPrintPreview" class="mb-8 grow rounded-3xl border border-white/60 bg-white/45 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl md:p-8">

        <!-- HEADER -->
        <div class="mb-8">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold tracking-tight text-slate-900">
                Print Ulang Pengajuan
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                Masukkan ID Pengajuan untuk memuat dan mencetak ulang form yang sudah pernah dibuat.
              </p>
            </div>
            <!-- Lencana Status Aktif -->
            <Transition name="fade">
              <div v-if="isDraftReady" class="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 md:flex">
                <span class="relative flex size-2.5">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span class="relative inline-flex size-2.5 rounded-full bg-green-500" />
                </span>
                <span class="text-xs font-semibold text-green-700">Pengajuan Ditemukan</span>
              </div>
            </Transition>
          </div>

          <div class="grid gap-3 md:grid-cols-[1fr_auto_auto] md:gap-4">
            <UInput
              v-model="searchId"
              type="text"
              class="w-full"
              size="xl"
              color="neutral"
              variant="outline"
              :highlight="hasSearchInputError"
              :ui="{ base: 'rounded-xl bg-white/80 px-4 py-3 font-mono uppercase shadow-sm transition-all focus:bg-white focus:ring-2' }"
              placeholder="Masukkan ID, contoh: KG-YYYYMMDD-0001"
              autocomplete="off"
              icon="i-lucide-search"
              @keyup.enter="handleLoadDraft({ source: 'manual' })"
            />
            <UButton
              type="button"
              class="w-full justify-center rounded-xl px-6 py-3.5 font-semibold transition-all hover:bg-slate-100 md:w-auto md:shrink-0"
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-lucide-search"
              :label="isLoadingDraft ? 'Mencari...' : 'Cari'"
              :loading="isLoadingDraft"
              :disabled="isLoadingDraft || isLoadingStoredDraft"
              @click="handleLoadDraft({ source: 'manual' })"
            />
            <UButton
              type="button"
              class="w-full justify-center rounded-xl px-6 py-3.5 font-semibold shadow-md shadow-blue-900/10 transition-all hover:-translate-y-0.5 hover:shadow-lg md:w-auto md:shrink-0"
              color="neutral"
              variant="solid"
              size="xl"
              icon="i-lucide-history"
              :label="isLoadingStoredDraft ? 'Memuat...' : 'Pengajuan Terakhir'"
              :loading="isLoadingStoredDraft"
              :disabled="isLoadingDraft || isLoadingStoredDraft"
              @click="handleLoadStoredDraft"
            />
          </div>
        </div>

        <Transition name="slide-up">
          <div v-if="isDraftReady" class="space-y-8">

            <hr class="border-slate-200/60">

            <!-- RINGKASAN DATA -->
            <div>
              <h3 class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <UIcon name="i-lucide-file-text" class="size-5 text-blue-600" />
                Ringkasan Data
                <span class="ml-2 rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800">{{ currentDraftId }}</span>
              </h3>

              <div class="grid gap-6 md:grid-cols-[1fr_2fr]">
                <!-- Info Pemohon -->
                <div class="rounded-2xl border border-slate-200 bg-white/50 p-5">
                  <dl class="space-y-4 text-sm">
                    <div>
                      <dt class="text-xs font-medium text-slate-500">Nama Pemohon</dt>
                      <dd class="mt-0.5 font-semibold text-slate-900">{{ loadedDraft?.nama || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-slate-500">Cabang / Bagian</dt>
                      <dd class="mt-0.5 font-medium text-slate-900">{{ loadedDraft?.bagianCabang || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-slate-500">Pemilik</dt>
                      <dd class="mt-0.5 font-medium text-slate-900">{{ loadedDraft?.pemilik || '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium text-slate-500">Tgl. Form</dt>
                      <dd class="mt-0.5 font-medium text-slate-900">{{ loadedDraft?.tanggalForm || '-' }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- List Produk -->
                <div class="rounded-2xl border border-slate-200 bg-white/50 p-5">
                  <p class="mb-3 text-xs font-medium text-slate-500">Item Produk ({{ loadedDraft?.items?.length || 0 }})</p>
                  <div class="max-h-55 space-y-3 overflow-y-auto pr-2">
                    <div
                      v-for="(item, idx) in loadedDraft?.items"
                      :key="idx"
                      class="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p class="font-bold text-slate-800">{{ item.model || 'Model tidak diketahui' }}</p>
                        <p class="mt-0.5 text-xs text-slate-500">{{ item.produk || 'Produk' }}</p>
                      </div>
                      <div class="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                        <UIcon name="i-lucide-barcode" class="size-4 text-slate-400" />
                        <span class="font-mono text-sm font-semibold text-slate-700">
                          {{ item.nomorSeri || 'N/A' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ACTION REVIEW -->
            <div class="flex flex-col-reverse justify-end gap-3 border-t border-slate-200/60 pt-6 sm:flex-row">
              <UButton
                type="button"
                class="w-full justify-center rounded-xl px-6 py-3.5 font-semibold text-slate-600 hover:bg-slate-100 sm:w-auto"
                color="neutral"
                variant="ghost"
                size="lg"
                icon="i-lucide-arrow-left"
                label="Cari ID Lain"
                @click="backToForm"
              />
              <UButton
                type="button"
                class="w-full justify-center rounded-xl px-8 py-3.5 font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
                color="primary"
                variant="solid"
                size="lg"
                icon="i-lucide-printer"
                label="Review & Cetak Ulang"
                @click="handleReviewPrint"
              />
            </div>

          </div>
        </Transition>
      </div>

      <!-- STATE: PREVIEW CETAK -->
      <section
        v-else
        id="section-print"
        class="mx-auto max-w-[210mm] bg-white p-6 text-sm text-slate-900"
      >
        <div class="no-print mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-blue-500">
                Preview Cetak Ulang
              </p>
              <h2 class="text-lg font-bold">
                Cetak Ulang Form {{ printId }}
              </h2>
              <p class="mt-1 text-sm text-blue-700">
                Periksa kembali data pada form di bawah ini sebelum dicetak.
              </p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                type="button"
                label="Kembali"
                icon="i-lucide-arrow-left"
                color="neutral"
                variant="subtle"
                @click="backToForm"
              />
              <UButton
                type="button"
                label="Cetak"
                icon="i-lucide-printer"
                color="primary"
                @click="printDraft"
              />
            </div>
          </div>
        </div>

        <div class="border-b border-slate-300 pb-4 text-center">
          <h1 class="text-xl font-bold">
            Form Permintaan Kartu Garansi
          </h1>
        </div>

        <table class="mt-5 w-full border-collapse text-sm">
          <tbody>
            <tr v-for="row in printMetadataRows" :key="row.label">
              <th class="w-1/3 border border-slate-400 bg-slate-100 p-2 text-left">
                {{ row.label }}
              </th>
              <td class="border border-slate-400 p-2">
                {{ row.value }}
              </td>
            </tr>
          </tbody>
        </table>

        <template v-if="printHasMultipleItems">
          <h2 class="mt-6 font-bold">
            Daftar Item
          </h2>
          <table class="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th class="border border-slate-400 bg-slate-100 p-2">
                  No
                </th>
                <th class="border border-slate-400 bg-slate-100 p-2">
                  Produk
                </th>
                <th class="border border-slate-400 bg-slate-100 p-2">
                  Model
                </th>
                <th class="border border-slate-400 bg-slate-100 p-2">
                  Nomor Seri
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in printPayload.items" :key="`${item.model}-${item.nomorSeri}-${index}`">
                <td class="border border-slate-400 p-2 text-center">
                  {{ index + 1 }}
                </td>
                <td class="border border-slate-400 p-2">
                  {{ item.produk }}
                </td>
                <td class="border border-slate-400 p-2">
                  {{ item.model }}
                </td>
                <td class="border border-slate-400 p-2">
                  {{ item.nomorSeri }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <div class="mt-8 text-[9px]">
          <div class="flex items-start gap-4">
            <p class="w-[30%] pt-1 text-[11px] font-semibold">
              Tanggal Form : {{ printTanggalForm }}
            </p>
            <table class="w-[70%] table-fixed border-collapse">
              <thead>
                <tr>
                  <th class="w-1/3 border border-black p-1 text-center font-bold">
                    Diajukan
                  </th>
                  <th class="w-1/3 border border-black p-1 text-center font-bold">
                    Diketahui
                  </th>
                  <th class="w-1/3 border border-black p-1 text-center font-bold">
                    Disetujui
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="h-20 w-1/3 border border-black p-1" />
                  <td class="h-20 w-1/3 border border-black p-1" />
                  <td class="h-20 w-1/3 border border-black p-1" />
                </tr>
                <tr>
                  <td class="w-1/3 border border-black p-1 text-center font-bold" />
                  <td class="w-1/3 border border-black p-1 text-center font-bold">
                    CS Head
                  </td>
                  <td class="w-1/3 border border-black p-1 text-center font-bold">
                    Branch Manager
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-14 flex items-start gap-4">
            <p class="w-[30%] pt-1 text-[11px] font-semibold">
              Disetujui dan diberikan :
            </p>
            <table class="w-[47%] table-fixed border-collapse">
              <thead>
                <tr>
                  <th class="w-1/2 border border-black p-1 text-center font-bold">
                    Diberikan
                  </th>
                  <th class="w-1/2 border border-black p-1 text-center font-bold">
                    Disetujui
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="h-20 w-1/2 border border-black p-1" />
                  <td class="h-20 w-1/2 border border-black p-1" />
                </tr>
                <tr>
                  <td class="w-1/2 border border-black p-1 text-center font-bold">
                    Controller
                  </td>
                  <td class="w-1/2 border border-black p-1 text-center font-bold">
                    QRCC Div. Head
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-2 text-[9px] leading-tight">
          <p class="font-bold">
            Catatan:
          </p>
          <p>1. Untuk permintaan Kartu Garansi mohon diisi nama jelasnya.</p>
          <p>2. Untuk permintaan melalui cabang, kolom diketahui harus diisi oleh kepala service.</p>
        </div>
      </section>
    </Transition>
  </section>
</template>

<style scoped>
/* Vue Transitions untuk Micro Interactions */
.layout-enter-active,
.layout-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.layout-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}
.layout-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-10px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.2);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
@media print {
  body * {
    visibility: hidden !important;
  }

  #section-print,
  #section-print * {
    visibility: visible !important;
  }

  #section-print {
    display: block !important;
    left: 0 !important;
    margin: 0 auto !important;
    max-width: none !important;
    padding: 0 !important;
    position: absolute !important;
    right: 0 !important;
    top: 0 !important;
    width: 100% !important;
  }

  .no-print,
  .no-print * {
    display: none !important;
    visibility: hidden !important;
  }

  @page {
    size: A4;
    margin: 14mm;
  }

  body {
    background: #fff !important;
  }
}
</style>
