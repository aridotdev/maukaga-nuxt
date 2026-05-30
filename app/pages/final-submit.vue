<script setup lang="ts">
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

type SubmitResponse = {
  idPengajuan?: string
}

type SubmissionPayload = {
  nama: string
  bagianCabang: string
  pemilik: string
  tanggalForm: string
  alasanPengajuan: string
  catatanTambahan: string
  items: Array<{
    produk: string
    model: string
    nomorSeri: string
  }>
  idPengajuan?: string
  resumeToken?: string
  fileBase64?: string
  fileExtension?: string
  fileMimeType?: string
}

type StoredDraftReference = {
  idPengajuan: string
  resumeToken: string
}

type LoadDraftReference = Partial<StoredDraftReference> & {
  fromUrl?: boolean
  source?: 'manual' | 'stored' | 'url'
}

const toast = useToast()
const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const fileInput = ref<HTMLInputElement | null>(null)

const draftStorageKey = 'pengajuan_kartu_garansi_draft'
const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10'
const maxUploadMb = computed(() => Number(runtimeConfig.public.maxUploadMb || 10))
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

const resumeId = ref('')
const currentDraftId = ref('')
const currentResumeToken = ref('')
const resumeUrl = ref('')
const loadedDraft = ref<DraftData | null>(null)
const selectedFile = ref<File | null>(null)
const successId = ref('')
const hasResumeInputError = ref(false)
const hasFileError = ref(false)
const isLoadingDraft = ref(false)
const isLoadingStoredDraft = ref(false)
const isSubmitting = ref(false)

const isDraftReady = computed(() => !!currentDraftId.value && !!currentResumeToken.value && !!loadedDraft.value)
const fileInfoText = computed(() => {
  if (!selectedFile.value) return 'Belum ada file dipilih. Wajib saat submit final.'

  const error = validateFile(selectedFile.value)
  return `${selectedFile.value.name} (${formatBytes(selectedFile.value.size)})${error ? ` — ${error}` : ''}`
})
const fileInfoClass = computed(() => validateFile(selectedFile.value) ? 'text-red-700' : 'text-slate-400')
const submitButtonText = computed(() => isSubmitting.value ? 'Mengirim...' : 'Submit Final Pengajuan')

onMounted(() => {
  initializeDraftResume()
})

watch(resumeId, () => {
  hasResumeInputError.value = false
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
    resumeId.value = fromUrl.idPengajuan
    void handleLoadDraft({ ...fromUrl, fromUrl: true, source: 'url' })
  }
}

async function handleLoadDraft(reference: LoadDraftReference = {}) {
  let idPengajuan = String(reference.idPengajuan || resumeId.value || '').trim()
  let resumeToken = String(reference.resumeToken || '').trim()
  const saved = getStoredDraftReference()

  if (!resumeToken && saved.idPengajuan === idPengajuan) resumeToken = saved.resumeToken

  if (!idPengajuan) {
    hasResumeInputError.value = true
    showToast('Masukkan ID Pengajuan, klik Draft Terakhir, atau buka Link Lanjutkan Draft.', 'error')
    return
  }

  const loadingState = reference.source === 'stored' ? isLoadingStoredDraft : isLoadingDraft
  loadingState.value = true
  hasResumeInputError.value = false

  try {
    if (!resumeToken) {
      const statusResult = await callAPI<DraftStatusResponse>('checkDraftPengajuanStatus', { idPengajuan })
      if (!statusResult.success) throw new Error(statusResult.error || 'ID Pengajuan tidak bisa dilanjutkan.')

      resumeToken = String(statusResult.data?.resumeToken || '').trim()
      if (!resumeToken) throw new Error('Draft ditemukan, tetapi Resume Token tidak tersedia. Draft ini tidak bisa dilanjutkan.')
    }

    const result = await callAPI<DraftData>('getDraftPengajuan', { idPengajuan, resumeToken })
    if (!result.success) throw new Error(result.error || 'Draft gagal dimuat')

    idPengajuan = result.data?.idPengajuan || idPengajuan
    loadedDraft.value = normalizeDraftData(result.data || {}, idPengajuan)
    setDraftReference(idPengajuan, resumeToken)
    resetSelectedFile()

    if (reference.fromUrl) clearResumeParamsFromUrl()

    showToast('Draft berhasil dimuat', 'success', `Draft ${idPengajuan} siap diupload final.`)
  } catch (error) {
    showToast('Draft gagal dimuat', 'error', getErrorMessage(error))
  } finally {
    loadingState.value = false
  }
}

function handleLoadStoredDraft() {
  const saved = getStoredDraftReference()
  if (!saved.idPengajuan || !saved.resumeToken) {
    showToast('Belum ada draft terakhir di browser ini. Buka Link Lanjutkan Draft jika memakai perangkat lain.', 'error')
    return
  }

  resumeId.value = saved.idPengajuan
  void handleLoadDraft({ ...saved, source: 'stored' })
}

function setDraftReference(idPengajuan: string, resumeToken: string) {
  currentDraftId.value = idPengajuan || ''
  currentResumeToken.value = resumeToken || ''
  resumeId.value = currentDraftId.value
  resumeUrl.value = currentDraftId.value && currentResumeToken.value ? buildResumeUrl(currentDraftId.value, currentResumeToken.value) : ''

  if (!import.meta.client || !currentDraftId.value) return

  try {
    localStorage.setItem(draftStorageKey, JSON.stringify({
      idPengajuan: currentDraftId.value,
      resumeToken: currentResumeToken.value,
      resumeUrl: resumeUrl.value,
      savedAt: new Date().toISOString()
    }))
  } catch {}
}

function clearDraftReference() {
  currentDraftId.value = ''
  currentResumeToken.value = ''
  resumeUrl.value = ''
  resumeId.value = ''
  loadedDraft.value = null

  if (!import.meta.client) return

  try {
    localStorage.removeItem(draftStorageKey)
  } catch {}
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

function buildResumeUrl(idPengajuan: string, resumeToken: string) {
  if (!import.meta.client || window.location.protocol === 'file:') return ''

  const url = new URL(window.location.href)
  url.searchParams.set('id', idPengajuan)
  url.searchParams.set('token', resumeToken)
  return url.toString()
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

function collectPayload(): SubmissionPayload {
  const draft = loadedDraft.value || {}

  return {
    nama: String(draft.nama || '').trim(),
    bagianCabang: String(draft.bagianCabang || '').trim(),
    pemilik: String(draft.pemilik || '').trim(),
    tanggalForm: String(draft.tanggalForm || '').trim(),
    alasanPengajuan: String(draft.alasanPengajuan || '').trim(),
    catatanTambahan: String(draft.catatanTambahan || '').trim(),
    items: (draft.items || []).map(item => ({
      produk: String(item.produk || '').trim(),
      model: String(item.model || '').trim(),
      nomorSeri: String(item.nomorSeri || '').trim()
    }))
  }
}

async function handleSubmitFinal() {
  if (!currentDraftId.value || !currentResumeToken.value || !loadedDraft.value) {
    showToast('Simpan draft terlebih dahulu, lanjutkan Draft Terakhir, atau buka Link Lanjutkan Draft sebelum Submit Final.', 'error')
    return
  }

  const payload = collectPayload()
  const validationErrors = getValidationErrors(payload)
  const fileError = validateFile(selectedFile.value)

  hasFileError.value = !!fileError

  if (validationErrors.length) {
    showToast('Data draft belum lengkap', 'error', [...new Set(validationErrors)].slice(0, 4).join(' • '))
    return
  }

  if (fileError || !selectedFile.value) {
    showToast(fileError || 'File hard copy wajib dilampirkan', 'error')
    return
  }

  isSubmitting.value = true

  try {
    payload.idPengajuan = currentDraftId.value
    payload.resumeToken = currentResumeToken.value
    payload.fileBase64 = await fileToBase64(selectedFile.value)
    payload.fileExtension = getFileExtension(selectedFile.value.name)
    payload.fileMimeType = selectedFile.value.type || getMimeTypeFromExtension(payload.fileExtension)

    const result = await callAPI<SubmitResponse>('submitDraftPengajuan', payload as unknown as Record<string, unknown>)
    if (!result.success) throw new Error(result.error || 'Pengajuan gagal dikirim')

    const submittedId = result.data?.idPengajuan || currentDraftId.value
    clearDraftReference()
    resetSelectedFile()
    successId.value = submittedId
    showToast('Pengajuan berhasil dikirim', 'success', `ID Pengajuan: ${submittedId}`)
  } catch (error) {
    showToast('Pengajuan gagal dikirim', 'error', getErrorMessage(error))
  } finally {
    isSubmitting.value = false
  }
}

function getValidationErrors(payload: SubmissionPayload) {
  const errors: string[] = []

  if (!payload.nama) errors.push('Nama wajib diisi')
  if (!payload.bagianCabang) errors.push('Bagian/Cabang wajib diisi')
  if (!payload.pemilik) errors.push('Pemilik wajib diisi')
  if (!payload.tanggalForm) errors.push('Tanggal Form wajib diisi')
  if (!payload.alasanPengajuan) errors.push('Alasan Pengajuan wajib diisi')

  if (payload.tanggalForm) {
    const selected = new Date(`${payload.tanggalForm}T00:00:00`)
    const max = new Date()
    max.setHours(23, 59, 59, 999)
    max.setDate(max.getDate() + 7)

    if (Number.isNaN(selected.getTime())) errors.push('Tanggal Form tidak valid')
    else if (selected > max) errors.push('Tanggal Form tidak boleh lebih dari 7 hari ke depan')
  }

  if (!payload.items.length) errors.push('Minimal 1 item produk wajib diisi')

  payload.items.forEach((item, index) => {
    if (!item.produk || !item.model || !item.nomorSeri) errors.push(`Item #${index + 1} belum lengkap`)
  })

  return errors
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] || null
  hasFileError.value = !!validateFile(selectedFile.value)
}

function resetSelectedFile() {
  selectedFile.value = null
  hasFileError.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function validateFile(file: File | null) {
  if (!file) return 'File hard copy wajib dilampirkan'

  const ext = getFileExtension(file.name)
  if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return 'Format file harus PDF/JPG/JPEG/PNG'
  if (file.size > maxUploadMb.value * 1024 * 1024) return `Ukuran file tidak boleh melebihi ${maxUploadMb.value}MB`

  return ''
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getFileExtension(name: string) {
  return String(name).split('.').pop()?.toLowerCase() || ''
}

function getMimeTypeFromExtension(extension?: string) {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  }

  return map[String(extension || '').toLowerCase()] || 'application/octet-stream'
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <section class="mx-auto flex min-h-full w-full max-w-4xl flex-col p-4 md:p-8">
    <div v-if="successId" class="mb-8 grow rounded-3xl border border-white/60 bg-white/45 p-6 text-center shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl md:p-8">
      <div class="mx-auto max-w-xl py-8">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <UIcon name="i-lucide-check" class="size-8" />
        </div>
        <h2 class="text-2xl font-bold text-slate-900">
          Pengajuan berhasil dikirim!
        </h2>
        <p class="mt-3 text-sm text-slate-500">
          Pengajuan berhasil dikirim dan akan diverifikasi oleh admin sebelum proses cetak.
        </p>
        <p class="mt-5 text-sm text-slate-500">
          ID Pengajuan Anda:
        </p>
        <p class="mt-2 rounded-xl bg-slate-100 px-4 py-3 font-mono text-lg font-bold text-blue-700">
          {{ successId }}
        </p>
        <NuxtLink
          to="/"
          class="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Kembali ke Portal
        </NuxtLink>
      </div>
    </div>

    <div v-else class="mb-8 grow rounded-3xl border border-white/60 bg-white/45 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl md:p-8">
      <div class="mx-auto">
        <h2 class="mb-2 text-xl font-bold text-slate-900 md:text-2xl">
          Lanjutkan Draft
        </h2>
        <p class="mb-6 text-sm text-slate-500">
          Lanjutkan draft terakhir dari browser ini, atau buka link lanjutkan dari saat draft disimpan.
        </p>

        <div class="space-y-6">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">ID Pengajuan</label>
            <div class="grid gap-3 md:grid-cols-[1fr_auto_auto] md:gap-4">
              <UInput
                v-model="resumeId"
                type="text"
                class="w-full"
                size="lg"
                color="neutral"
                variant="outline"
                :highlight="hasResumeInputError"
                :ui="{ base: 'rounded-xl bg-slate-50 px-4 py-2.5 font-mono uppercase' }"
                placeholder="KG-YYYYMMDD-0001"
                autocomplete="off"
                @keyup.enter="handleLoadDraft({ source: 'manual' })"
              />
              <UButton
                type="button"
                class="w-full justify-center rounded-xl px-6 py-3 font-semibold md:w-auto md:shrink-0"
                color="neutral"
                variant="outline"
                size="lg"
                icon="i-lucide-download"
                :label="isLoadingDraft ? 'Memuat...' : 'Muat Draft'"
                :loading="isLoadingDraft"
                :disabled="isLoadingDraft || isLoadingStoredDraft"
                @click="handleLoadDraft({ source: 'manual' })"
              />
              <UButton
                type="button"
                class="w-full justify-center rounded-xl px-6 py-3 font-semibold shadow-lg shadow-blue-600/20 md:w-auto md:shrink-0"
                color="neutral"
                variant="solid"
                size="lg"
                icon="i-lucide-folder-plus"
                :label="isLoadingStoredDraft ? 'Memuat...' : 'Draft Terakhir'"
                :loading="isLoadingStoredDraft"
                :disabled="isLoadingDraft || isLoadingStoredDraft"
                @click="handleLoadStoredDraft"
              />
            </div>

            <div v-if="currentDraftId" class="mt-3 rounded-xl bg-green-100 px-3 py-2 text-sm text-slate-900">
              Draft aktif: <strong class="font-mono">{{ currentDraftId }}</strong>. Upload file signed lalu klik Submit Final.
            </div>
          </div>

          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="translate-y-2 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
          >
            <div v-if="isDraftReady" class="space-y-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700">Upload File Hard Copy Bertanda Tangan</label>
                <button
                  type="button"
                  class="w-full cursor-pointer rounded-2xl border-2 border-dashed bg-slate-50 p-8 text-center transition-colors hover:bg-slate-100"
                  :class="hasFileError ? 'border-red-300' : 'border-slate-300'"
                  @click="triggerFilePicker"
                >
                  <UIcon name="i-lucide-file-plus-2" class="mx-auto mb-3 size-12 text-slate-400" />
                  <span class="block text-sm font-semibold text-slate-700">Klik untuk memilih file hasil pindai</span>
                  <span class="mt-1 block text-xs" :class="fileInfoClass">{{ fileInfoText }}</span>
                  <span class="mt-1 block text-xs text-slate-400">Pastikan formulir fisik telah ditandatangani. (Maks {{ maxUploadMb }}MB)</span>
                </button>
                <input
                  ref="fileInput"
                  type="file"
                  class="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  @change="handleFileChange"
                >
              </div>

              <div class="flex justify-end pt-2">
                <UButton
                  type="button"
                  class="w-full justify-center rounded-xl px-6 py-3 font-medium md:w-auto"
                  color="primary"
                  variant="solid"
                  size="lg"
                  icon="i-lucide-send"
                  :label="submitButtonText"
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                  @click="handleSubmitFinal"
                />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </section>
</template>
