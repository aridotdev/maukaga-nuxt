<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date'

definePageMeta({
  layout: 'cs'
})

type ToastColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

type DateValueLike = {
  year: number
  month: number
  day: number
  toString: () => string
}

type ProductItem = {
  model: string
  namaProduk: string
  nomorSeri: string
}

type FormState = {
  namaPemohon: string
  bagianCabang: string
  namaPemilikBarang: string
  alasanPengajuan: string
  catatanTambahan: string
  products: ProductItem[]
}

type ApiResult<T = Record<string, unknown>> = {
  success: boolean
  data?: T
  error?: string
}

type ModelProdukRow = {
  model?: string
  modelNormalized?: string
  produk?: string
}

type ModelProdukResponse = {
  rows?: ModelProdukRow[]
}

type DraftResponse = {
  idPengajuan?: string
  resumeToken?: string
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
}

type PrintRow = {
  label: string
  value: string
}

const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const inputDate = useTemplateRef('inputDate')
const draftStorageKey = 'pengajuan_kartu_garansi_draft'
const maxItems = computed(() => Number(runtimeConfig.public.maxItems || 10))
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

const formState = reactive<FormState>({
  namaPemohon: '',
  bagianCabang: '',
  namaPemilikBarang: '',
  alasanPengajuan: '',
  catatanTambahan: '',
  products: [createProductItem()]
})

const tanggalForm = shallowRef<DateValueLike>(createTodayDateValue())
const fieldErrors = reactive<Record<string, string>>({})
const modelProdukMap = ref<Record<string, string>>({})
const currentDraftId = ref('')
const currentResumeToken = ref('')
const isSavingDraft = ref(false)
const showPrintPreview = ref(false)
const savedPrintPayload = ref<SubmissionPayload | null>(null)
const savedPrintId = ref('')

const finalSubmitUrl = computed(() => {
  if (!currentDraftId.value) return '/final-submit'

  return {
    path: '/final-submit',
    query: currentResumeToken.value
      ? { id: currentDraftId.value, token: currentResumeToken.value }
      : { id: currentDraftId.value }
  }
})
const printPayload = computed(() => savedPrintPayload.value || collectPayload())
const printId = computed(() => savedPrintId.value || currentDraftId.value || '-')
const printTanggalForm = computed(() => formatDate(printPayload.value.tanggalForm))
const printMetadataRows = computed<PrintRow[]>(() => {
  const payload = printPayload.value
  const rows: PrintRow[] = [
    { label: 'ID Pengajuan', value: printId.value },
    { label: 'Nama', value: payload.nama },
    { label: 'Bagian/Cabang', value: payload.bagianCabang },
    { label: 'Pemilik', value: payload.pemilik },
    { label: 'Alasan Pengajuan', value: payload.alasanPengajuan },
    { label: 'Catatan Tambahan', value: payload.catatanTambahan || '-' }
  ]

  if (payload.items.length === 1) {
    rows.push(
      { label: 'Produk', value: payload.items[0]?.produk || '' },
      { label: 'Model', value: payload.items[0]?.model || '' },
      { label: 'Nomor Seri', value: payload.items[0]?.nomorSeri || '' }
    )
  }

  return rows
})
const printHasMultipleItems = computed(() => printPayload.value.items.length > 1)

onMounted(() => {
  loadModelProduk()
})

function createProductItem(): ProductItem {
  return { model: '', namaProduk: '', nomorSeri: '' }
}

function showToast(title: string, color: ToastColor = 'info', description?: string) {
  toast.add({ title, description, color })
}

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

async function loadModelProduk() {
  try {
    const result = await callAPI<ModelProdukResponse>('getModelProduk')
    if (!result.success) throw new Error(result.error || 'Master model produk gagal dimuat')

    const map: Record<string, string> = {}
    for (const row of result.data?.rows || []) {
      const key = row.modelNormalized || normalizeModelKey(row.model)
      if (key && row.produk) map[key] = row.produk
    }
    modelProdukMap.value = map
    formState.products.forEach((_, index) => applyModelProdukToItem(index))
  } catch {
    modelProdukMap.value = {}
  }
}

function normalizeModelKey(value?: string) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase()
}

function getProdukForModel(model: string) {
  return modelProdukMap.value[normalizeModelKey(model)] || ''
}

function isProdukLocked(product: ProductItem) {
  return !!getProdukForModel(product.model)
}

function applyModelProdukToItem(index: number) {
  const item = formState.products[index]
  if (!item) return false

  const produk = getProdukForModel(item.model)
  if (!produk) return false

  item.namaProduk = produk
  clearFieldError(`products.${index}.namaProduk`)
  return true
}

function updateProductModel(index: number, value: string | number | undefined) {
  const item = formState.products[index]
  if (!item) return

  const wasLocked = isProdukLocked(item)
  item.model = String(value || '')
  clearFieldError(`products.${index}.model`)

  const produk = getProdukForModel(item.model)
  if (produk) {
    item.namaProduk = produk
    clearFieldError(`products.${index}.namaProduk`)
  } else if (wasLocked) {
    item.namaProduk = ''
  }
}

function updateProductName(index: number, value: string | number | undefined) {
  const item = formState.products[index]
  if (!item || isProdukLocked(item)) return
  item.namaProduk = String(value || '')
  clearFieldError(`products.${index}.namaProduk`)
}

function updateProductSerial(index: number, value: string | number | undefined) {
  const item = formState.products[index]
  if (!item) return
  item.nomorSeri = String(value || '')
  clearFieldError(`products.${index}.nomorSeri`)
}

function addItem() {
  if (formState.products.length >= maxItems.value) {
    showToast('Jumlah item sudah maksimal', 'warning', `Maksimal ${maxItems.value} item produk.`)
    return
  }

  formState.products.push(createProductItem())
}

function removeItem(index: number) {
  if (formState.products.length <= 1) {
    showToast('Minimal 1 item produk wajib diisi.', 'warning')
    return
  }

  formState.products.splice(index, 1)
  clearValidationErrors()
}

function setFieldError(name: string, message: string) {
  fieldErrors[name] = message
}

function clearFieldError(name: string) {
  fieldErrors[name] = ''
}

function clearValidationErrors() {
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = ''
}

function validateForm() {
  clearValidationErrors()
  const errors: string[] = []

  const requiredFields: Array<[keyof FormState, string, string]> = [
    ['namaPemohon', 'Nama Pemohon wajib diisi', 'namaPemohon'],
    ['bagianCabang', 'Bagian/Cabang wajib diisi', 'bagianCabang'],
    ['namaPemilikBarang', 'Nama Pemilik Barang wajib diisi', 'namaPemilikBarang'],
    ['alasanPengajuan', 'Alasan Pengajuan wajib diisi', 'alasanPengajuan']
  ]

  for (const [field, message, errorKey] of requiredFields) {
    if (!String(formState[field] || '').trim()) {
      errors.push(message)
      setFieldError(errorKey, message)
    }
  }

  if (!tanggalForm.value) {
    errors.push('Tanggal Form wajib diisi')
    setFieldError('tanggalForm', 'Tanggal Form wajib diisi')
  } else if (isDateMoreThanSevenDaysAhead(tanggalForm.value)) {
    errors.push('Tanggal Form tidak boleh lebih dari 7 hari ke depan')
    setFieldError('tanggalForm', 'Tanggal Form tidak boleh lebih dari 7 hari ke depan')
  }

  if (!formState.products.length) {
    errors.push('Minimal 1 item produk wajib diisi')
  }

  formState.products.forEach((product, index) => {
    if (!product.model.trim()) {
      const message = `Item #${index + 1}: Model wajib diisi`
      errors.push(message)
      setFieldError(`products.${index}.model`, message)
    }
    if (!product.namaProduk.trim()) {
      const message = `Item #${index + 1}: Nama produk wajib diisi`
      errors.push(message)
      setFieldError(`products.${index}.namaProduk`, message)
    }
    if (!product.nomorSeri.trim()) {
      const message = `Item #${index + 1}: Nomor seri wajib diisi`
      errors.push(message)
      setFieldError(`products.${index}.nomorSeri`, message)
    }
  })

  if (errors.length) {
    showToast('Form belum lengkap', 'error', [...new Set(errors)].slice(0, 4).join(' • '))
    return false
  }

  return true
}

function isDateMoreThanSevenDaysAhead(value: DateValueLike) {
  const selected = new Date(value.year, value.month - 1, value.day)
  const max = new Date()
  max.setHours(23, 59, 59, 999)
  max.setDate(max.getDate() + 7)
  return selected > max
}

function dateToPayload(value: DateValueLike | undefined) {
  return value ? value.toString() : ''
}

function createTodayDateValue() {
  return today(getLocalTimeZone())
}

function collectPayload(): SubmissionPayload {
  return {
    nama: formState.namaPemohon.trim(),
    bagianCabang: formState.bagianCabang.trim(),
    pemilik: formState.namaPemilikBarang.trim(),
    tanggalForm: dateToPayload(tanggalForm.value),
    alasanPengajuan: formState.alasanPengajuan.trim(),
    catatanTambahan: formState.catatanTambahan.trim(),
    items: formState.products.map(item => ({
      produk: item.namaProduk.trim(),
      model: item.model.trim(),
      nomorSeri: item.nomorSeri.trim()
    }))
  }
}

async function onDraftSubmit() {
  await handleSaveDraftAndPrint()
}

async function handleSaveDraftAndPrint() {
  if (!validateForm()) return

  isSavingDraft.value = true
  try {
    const payload = collectPayload()
    if (currentDraftId.value && currentResumeToken.value) {
      payload.idPengajuan = currentDraftId.value
      payload.resumeToken = currentResumeToken.value
    }

    const result = await callAPI<DraftResponse>('saveDraftPengajuan', payload as unknown as Record<string, unknown>)
    if (!result.success) throw new Error(result.error || 'Draft gagal disimpan')

    setDraftReference(result.data?.idPengajuan || '', result.data?.resumeToken || '')
    savedPrintPayload.value = clonePayload({
      ...payload,
      idPengajuan: currentDraftId.value,
      resumeToken: currentResumeToken.value
    })
    savedPrintId.value = currentDraftId.value
    showPrintPreview.value = true
    showToast('Draft berhasil disimpan', 'success', `ID Pengajuan: ${currentDraftId.value}`)
  } catch (error) {
    showToast('Draft gagal disimpan', 'error', getErrorMessage(error))
  } finally {
    isSavingDraft.value = false
  }
}

function setDraftReference(idPengajuan: string, resumeToken: string) {
  currentDraftId.value = idPengajuan
  currentResumeToken.value = resumeToken

  if (!import.meta.client || !idPengajuan) return

  const resumeUrl = buildFinalSubmitUrl(idPengajuan, resumeToken)
  localStorage.setItem(draftStorageKey, JSON.stringify({
    idPengajuan,
    resumeToken,
    resumeUrl,
    savedAt: new Date().toISOString()
  }))
}

function buildFinalSubmitUrl(idPengajuan: string, resumeToken: string) {
  if (!import.meta.client || window.location.protocol === 'file:') return ''

  const url = new URL('/final-submit', window.location.origin)
  url.searchParams.set('id', idPengajuan)
  if (resumeToken) url.searchParams.set('token', resumeToken)
  return url.toString()
}

function backToForm() {
  showPrintPreview.value = false
}

function printDraft() {
  window.print()
}

function clonePayload(payload: SubmissionPayload): SubmissionPayload {
  return JSON.parse(JSON.stringify(payload)) as SubmissionPayload
}

function formatDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID') : '-'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <div class="new-page-root">
    <div v-show="!showPrintPreview" class="new-page-form relative mx-auto flex w-full max-w-350 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <!-- Header Section -->
      <header class="flex flex-col items-start justify-between gap-3 rounded-2xl border border-muted bg-default/45 p-4 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:p-5">
        <div class="min-w-0 flex-1">
          <h1 class="mb-1 text-xl font-bold text-highlighted lg:text-2xl">
            Form Pengajuan Kartu Garansi Baru
          </h1>
          <p class="max-w-none truncate text-xs leading-relaxed text-muted lg:text-sm">
            Lengkapi data pengajuan, simpan draft, lalu cetak hard copy untuk ditandatangani.
          </p>
        </div>
      </header>

      <!-- Main Content Layout (Left Form, Right Sidebar) -->
      <div class="flex flex-col gap-6 lg:flex-row">
        <!-- Left Column: Form Areas -->
        <UForm
          :state="formState"
          class="flex flex-1 flex-col gap-6"
          @submit="onDraftSubmit"
        >
          <!-- Section 1: Informasi Pemohon -->
          <section class="relative rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl lg:p-8">
            <div class="mb-8 flex items-center justify-between border-b border-muted pb-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border border-muted bg-default/60 text-highlighted shadow-sm">
                  <UIcon name="i-lucide-user" class="size-5" />
                </div>
                <div>
                  <p class="mb-1 text-xs font-bold uppercase tracking-wider text-dimmed">
                    Langkah 01
                  </p>
                  <h2 class="text-xl font-bold text-highlighted">
                    Informasi Pemohon
                  </h2>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <UFormField name="namaPemohon" label="Nama Pemohon" size="lg" :error="fieldErrors.namaPemohon">
                <UInput
                  v-model="formState.namaPemohon"
                  placeholder="Masukkan nama Anda"
                  class="w-full"
                  size="lg"
                  @update:model-value="clearFieldError('namaPemohon')"
                />
              </UFormField>

              <UFormField name="bagianCabang" label="Bagian/Cabang" size="lg" :error="fieldErrors.bagianCabang">
                <UInput
                  v-model="formState.bagianCabang"
                  placeholder="Contoh: Cabang Jakarta Pusat"
                  class="w-full"
                  size="lg"
                  @update:model-value="clearFieldError('bagianCabang')"
                />
              </UFormField>

              <UFormField name="namaPemilikBarang" label="Nama Pemilik Barang" size="lg" :error="fieldErrors.namaPemilikBarang">
                <UInput
                  v-model="formState.namaPemilikBarang"
                  placeholder="Masukkan nama pemilik barang"
                  class="w-full"
                  size="lg"
                  @update:model-value="clearFieldError('namaPemilikBarang')"
                />
              </UFormField>

              <UFormField name="tanggalForm" label="Tanggal Form" size="lg" :error="fieldErrors.tanggalForm">
                <UInputDate
                  ref="inputDate"
                  v-model="tanggalForm"
                  class="w-full"
                  size="lg"
                  @update:model-value="clearFieldError('tanggalForm')"
                >
                  <template #trailing>
                    <UPopover :reference="inputDate?.inputsRef[3]?.$el">
                      <UButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        icon="i-lucide-calendar"
                        aria-label="Pilih tanggal"
                        class="px-0"
                      />

                      <template #content>
                        <UCalendar v-model="tanggalForm" class="p-2" />
                      </template>
                    </UPopover>
                  </template>
                </UInputDate>
              </UFormField>

              <UFormField name="alasanPengajuan" label="Alasan Pengajuan" size="lg" :error="fieldErrors.alasanPengajuan">
                <UTextarea
                  v-model="formState.alasanPengajuan"
                  placeholder="Jelaskan alasan pengajuan kartu garansi baru"
                  class="w-full"
                  size="lg"
                  :rows="5"
                  @update:model-value="clearFieldError('alasanPengajuan')"
                />
              </UFormField>

              <UFormField name="catatanTambahan" label="Catatan Tambahan" hint="Opsional" size="lg">
                <UTextarea
                  v-model="formState.catatanTambahan"
                  placeholder="Tambahkan catatan jika ada"
                  class="w-full"
                  size="lg"
                  :rows="5"
                />
              </UFormField>
            </div>
          </section>

          <!-- Section 2: Daftar Produk -->
          <section class="flex flex-col rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl lg:p-8">
            <div class="mb-6 flex items-center justify-between border-b border-muted pb-4">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border border-muted bg-default/60 text-highlighted shadow-sm">
                  <UIcon name="i-lucide-package" class="size-5" />
                </div>
                <div>
                  <p class="mb-1 text-xs font-bold uppercase tracking-wider text-dimmed">
                    Langkah 02
                  </p>
                  <h2 class="text-xl font-bold text-highlighted">
                    Daftar Produk
                  </h2>
                </div>
              </div>
              <UButton
                type="button"
                label="Tambah Item"
                icon="i-lucide-plus"
                color="neutral"
                variant="subtle"
                :disabled="formState.products.length >= maxItems"
                @click="addItem"
              />
            </div>

            <!-- Item List -->
            <div class="mb-8 overflow-hidden rounded-xl border border-muted bg-default/35 shadow-sm backdrop-blur-lg">
              <div class="hidden grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] gap-3 border-b border-muted px-4 py-3 text-xs font-semibold uppercase tracking-wider text-toned md:grid">
                <span class="text-center">#</span>
                <span>Model <span class="text-error">*</span></span>
                <span>Produk / Nama Produk <span class="text-error">*</span></span>
                <span>Nomor Seri <span class="text-error">*</span></span>
                <span />
              </div>

              <div class="flex flex-col gap-2 p-3">
                <div
                  v-for="(product, index) in formState.products"
                  :key="index"
                  class="grid grid-cols-1 gap-3 rounded-lg border border-muted bg-default/60 p-3 shadow-xs md:grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] md:items-start"
                >
                  <div class="flex items-center gap-3 md:justify-center md:pt-1">
                    <span class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {{ index + 1 }}
                    </span>
                    <span class="text-xs font-semibold uppercase tracking-wider text-toned md:hidden">
                      Item Produk
                    </span>
                  </div>

                  <UFormField :name="`products.${index}.model`" size="sm" :error="fieldErrors[`products.${index}.model`]">
                    <UInput
                      :model-value="product.model"
                      aria-label="Tipe atau model produk"
                      placeholder="Tipe/Model"
                      class="w-full"
                      color="neutral"
                      variant="outline"
                      size="md"
                      @update:model-value="value => updateProductModel(index, value)"
                    />
                  </UFormField>

                  <UFormField :name="`products.${index}.namaProduk`" size="sm" :error="fieldErrors[`products.${index}.namaProduk`]">
                    <UInput
                      :model-value="product.namaProduk"
                      :disabled="isProdukLocked(product)"
                      aria-label="Produk atau nama produk"
                      placeholder="Nama Produk"
                      class="w-full"
                      color="neutral"
                      variant="outline"
                      size="md"
                      @update:model-value="value => updateProductName(index, value)"
                    />
                  </UFormField>

                  <UFormField :name="`products.${index}.nomorSeri`" size="sm" :error="fieldErrors[`products.${index}.nomorSeri`]">
                    <UInput
                      :model-value="product.nomorSeri"
                      aria-label="Nomor seri produk"
                      placeholder="S/N"
                      class="w-full"
                      color="neutral"
                      variant="outline"
                      size="md"
                      @update:model-value="value => updateProductSerial(index, value)"
                    />
                  </UFormField>

                  <div class="flex justify-end md:pt-1">
                    <UButton
                      type="button"
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="sm"
                      :disabled="formState.products.length <= 1"
                      :aria-label="`Hapus item ${index + 1}`"
                      @click="removeItem(index)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Action in Form Area -->
            <div class="mt-auto flex flex-col items-center justify-between gap-4 border-t border-muted pt-6 sm:flex-row">
              <p class="text-xs italic text-muted">
                Draft akan tersimpan di database sebelum dicetak. Upload final dilakukan di halaman Final Submit.
              </p>
              <UButton
                type="submit"
                label="Simpan Draft & Cetak"
                icon="i-lucide-printer"
                color="primary"
                size="lg"
                class="w-full justify-center sm:w-auto"
                :loading="isSavingDraft"
              />
            </div>
          </section>
        </UForm>

        <!-- Right Column: Sidebar / Status Tracker -->
        <aside class="flex w-full flex-col gap-6 lg:w-80">
          <!-- Status Tracker Panel -->
          <div class="rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl">
            <div class="mb-6 flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-muted bg-default/60 text-highlighted shadow-sm">
                <UIcon name="i-lucide-file-text" class="size-5" />
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-dimmed">
                  Alur Berkas
                </p>
                <h3 class="text-base font-bold text-highlighted">
                  Proses Pengajuan
                </h3>
              </div>
            </div>

            <div class="relative flex flex-col gap-3">
              <!-- Connecting Line -->
              <div class="absolute bottom-8 left-5.5 top-8 z-0 w-0.5 border-l border-muted bg-muted" />

              <div class="relative z-10 flex gap-4 rounded-2xl border border-inverted bg-inverted p-4 text-inverted shadow-sm">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-default/30 bg-default/20 text-sm font-bold backdrop-blur-sm">
                  01
                </div>
                <div>
                  <h4 class="mb-1 text-sm font-bold text-inverted">
                    Lengkapi data
                  </h4>
                  <p class="text-xs leading-relaxed text-inverted/80">
                    Isi data pemohon, alasan, dan daftar produk secara detail.
                  </p>
                </div>
              </div>

              <div class="relative z-10 flex gap-4 rounded-2xl border border-muted bg-default/40 p-4 shadow-sm backdrop-blur-sm transition-colors hover:bg-default/60">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-muted bg-default text-sm font-bold text-highlighted shadow-sm">
                  02
                </div>
                <div>
                  <h4 class="mb-1 text-sm font-bold text-highlighted">
                    Cetak draft
                  </h4>
                  <p class="text-xs leading-relaxed text-muted">
                    Simpan draft, cetak form fisik, lalu minta tanda tangan basah.
                  </p>
                </div>
              </div>

              <div class="relative z-10 flex gap-4 rounded-2xl border border-dashed border-muted bg-muted/20 p-4 opacity-80 backdrop-blur-sm">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-dimmed">
                  03
                </div>
                <div>
                  <h4 class="mb-1 text-sm font-bold text-toned">
                    Final submit
                  </h4>
                  <p class="text-xs leading-relaxed text-dimmed">
                    Upload scan/foto hard copy bertanda tangan melalui halaman Final Submit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <section
      v-show="showPrintPreview"
      id="section-print"
      class="mx-auto max-w-[210mm] bg-white p-6 text-sm text-slate-900"
    >
      <div class="no-print mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-blue-500">
              Preview Draft
            </p>
            <h2 class="text-lg font-bold">
              Draft {{ printId }} siap dicetak
            </h2>
            <p class="mt-1 text-sm text-blue-700">
              Setelah ditandatangani, lanjutkan upload dokumen melalui halaman Final Submit.
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <UButton
              type="button"
              label="Kembali ke Form"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="subtle"
              @click="backToForm"
            />
            <UButton
              :to="finalSubmitUrl"
              label="Final Submit"
              icon="i-lucide-upload"
              color="neutral"
              variant="outline"
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
  </div>
</template>

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
