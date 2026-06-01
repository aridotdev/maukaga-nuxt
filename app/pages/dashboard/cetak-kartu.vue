<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type CardTypeKey = 'local' | 'import'
type CardTypeFilter = 'all' | CardTypeKey | 'unset'
type ViewMode = 'queue' | 'settings' | 'shipping-label'
type PrintMode = 'warranty-cards' | 'shipping-labels'

type WarrantyPrintQueueRow = {
  key: string
  idPengajuan: string
  noItem: string | number
  produk: string
  model: string
  nomorSeri: string
  jenisKartu: 'Local' | 'Import' | ''
  jenisKartuKey: CardTypeKey | ''
  statusCetak: 'Belum Dicetak' | 'Printed' | string
  printBatchId: string
  printedAt: string
  printedBy: string
  reprintCount: number
  nama: string
  bagianCabang: string
  timestampSubmit: string
}

type WarrantyPrintQueueResponse = {
  rows: WarrantyPrintQueueRow[]
  summary: {
    total: number
    local: number
    import: number
    belumJenisKartu: number
    printed: number
  }
}

type PrintLayout = {
  id: string
  type: CardTypeKey
  name: string
  offsetX: number
  offsetY: number
  gapProductModel: number
  gapModelSerial: number
  isBuiltin: boolean
  createdAt?: string
  updatedAt?: string
  updatedBy?: string
}

type PrintLayoutState = {
  layouts: PrintLayout[]
  active: Record<CardTypeKey, string>
  activeLayouts: Record<CardTypeKey, PrintLayout | null>
  savedLayoutId?: string
}

type ShippingLabel = {
  cabang: string
  qty: number
}

type AlertState = {
  type: 'success' | 'error' | 'info' | 'loading'
  title: string
  description?: string
  batchId?: string
} | null

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const USelect = resolveComponent('USelect')

const toast = useToast()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))
const adminName = ref('Admin')
const currentView = ref<ViewMode>('queue')
const printQueue = ref<WarrantyPrintQueueRow[]>([])
const selectedPrintKeys = ref<Set<string>>(new Set())
const search = ref('')
const cardTypeFilter = ref<CardTypeFilter>('all')
const isQueueLoading = ref(false)
const isActionLoading = ref(false)
const alertState = ref<AlertState>(null)
const confirmPrintedOpen = ref(false)

const printLayouts = ref<PrintLayout[]>([])
const activePrintLayoutIds = ref<Record<CardTypeKey, string>>({
  local: 'local-default',
  import: 'import-default'
})
const activePrintLayouts = ref<Record<CardTypeKey, PrintLayout | null>>({
  local: null,
  import: null
})
const selectedLayoutType = ref<CardTypeKey>('local')
const selectedLayoutId = ref('')
const editingLayout = ref<PrintLayout>(createEmptyPrintLayout('local'))
const isLayoutLoading = ref(false)

const shippingLabels = ref<ShippingLabel[]>([])
const shippingLabelMeta = ref({
  batchId: '',
  search: '',
  totalItems: 0
})
const printMode = ref<PrintMode>('warranty-cards')
const warrantyPrintRows = ref<WarrantyPrintQueueRow[]>([])
const labelPrintRows = ref<ShippingLabel[]>([])

let searchTimer: ReturnType<typeof setTimeout> | undefined

const cardTypeFilterItems = [{
  label: 'Semua Jenis',
  value: 'all'
}, {
  label: 'Local',
  value: 'local'
}, {
  label: 'Import',
  value: 'import'
}, {
  label: 'Belum Dipilih',
  value: 'unset'
}]

const cardTypeItems = [{
  label: 'Pilih',
  value: ''
}, {
  label: 'Local',
  value: 'local'
}, {
  label: 'Import',
  value: 'import'
}]

const layoutTypeItems = [{
  label: 'Local',
  value: 'local'
}, {
  label: 'Import',
  value: 'import'
}]

const visiblePrintRows = computed(() => {
  const typeOrder: Record<string, number> = { local: 1, import: 2, '': 3 }
  return printQueue.value
    .filter((row) => {
      if (cardTypeFilter.value === 'unset') return !row.jenisKartuKey
      if (cardTypeFilter.value === 'all') return true
      return row.jenisKartuKey === cardTypeFilter.value
    })
    .toSorted((a, b) =>
      (typeOrder[a.jenisKartuKey || ''] || 3) - (typeOrder[b.jenisKartuKey || ''] || 3)
      || String(a.idPengajuan).localeCompare(String(b.idPengajuan))
      || Number(a.noItem) - Number(b.noItem)
    )
})

const visibleSummary = computed(() => {
  return visiblePrintRows.value.reduce(
    (summary, row) => {
      if (row.jenisKartuKey === 'local') summary.local += 1
      else if (row.jenisKartuKey === 'import') summary.import += 1
      else summary.unset += 1
      return summary
    },
    { total: visiblePrintRows.value.length, local: 0, import: 0, unset: 0 }
  )
})

const queueLoadError = computed(() => {
  if (alertState.value?.type !== 'error') return ''
  return alertState.value.description || alertState.value.title
})

const selectedRows = computed(() => {
  return Array.from(selectedPrintKeys.value)
    .map((key) => printQueue.value.find((row) => row.key === key))
    .filter(Boolean) as WarrantyPrintQueueRow[]
})

const selectedRowsSorted = computed(() => {
  const typeOrder: Record<string, number> = { local: 1, import: 2, '': 3 }
  return [...selectedRows.value].sort((a, b) =>
    (typeOrder[a.jenisKartuKey || ''] || 3) - (typeOrder[b.jenisKartuKey || ''] || 3)
    || String(a.idPengajuan).localeCompare(String(b.idPengajuan))
    || Number(a.noItem) - Number(b.noItem)
  )
})

const visibleKeys = computed(() => visiblePrintRows.value.map((row) => row.key))
const selectedVisibleCount = computed(() => visibleKeys.value.filter((key) => selectedPrintKeys.value.has(key)).length)
const allVisibleSelected = computed(() => visibleKeys.value.length > 0 && selectedVisibleCount.value === visibleKeys.value.length)
const someVisibleSelected = computed(() => selectedVisibleCount.value > 0 && selectedVisibleCount.value < visibleKeys.value.length)
const checkboxAllState = computed(() => someVisibleSelected.value ? 'indeterminate' : allVisibleSelected.value)

const layoutOptions = computed(() => {
  return printLayouts.value
    .filter((layout) => layout.type === selectedLayoutType.value)
    .map((layout) => ({
      label: `${layout.name}${layout.isBuiltin ? ' (bawaan)' : ''}${activePrintLayoutIds.value[selectedLayoutType.value] === layout.id ? ' - aktif' : ''}`,
      value: layout.id
    }))
})

const shippingLabelSummary = computed(() => {
  const totalQty = shippingLabels.value.reduce((sum, label) => sum + Number(label.qty || 0), 0)
  return {
    branches: shippingLabels.value.length,
    totalQty,
    size: '60 x 50 mm'
  }
})

const warrantyColumns: TableColumn<WarrantyPrintQueueRow>[] = [{
  id: 'select',
  header: () => h(UCheckbox, {
    modelValue: checkboxAllState.value,
    'aria-label': 'Pilih semua item tampil',
    'onUpdate:modelValue': (value: boolean | 'indeterminate') => toggleVisiblePrintRows(!!value)
  }),
  cell: ({ row }) => h(UCheckbox, {
    modelValue: selectedPrintKeys.value.has(row.original.key),
    'aria-label': `Pilih ${row.original.idPengajuan} item ${row.original.noItem}`,
    'onUpdate:modelValue': (value: boolean | 'indeterminate') => handlePrintRowCheck(row.original.key, !!value)
  }),
  meta: {
    class: {
      th: 'w-12',
      td: 'w-12'
    }
  }
}, {
  accessorKey: 'idPengajuan',
  header: 'ID & Item',
  cell: ({ row }) => h('div', { class: 'min-w-0' }, [
    h('p', { class: 'font-mono text-sm font-bold text-highlighted' }, row.original.idPengajuan),
    h('p', { class: 'mt-1 text-xs text-muted' }, `Item #${row.original.noItem}`)
  ])
}, {
  accessorKey: 'bagianCabang',
  header: 'Cabang',
  cell: ({ row }) => h('div', { class: 'min-w-36' }, [
    h('p', { class: 'font-semibold text-toned' }, row.original.bagianCabang || '-'),
    h('p', { class: 'mt-1 text-xs text-muted' }, row.original.nama || '-')
  ])
}, {
  accessorKey: 'produk',
  header: 'Detail Produk',
  cell: ({ row }) => h('div', { class: 'min-w-72' }, [
    h('p', { class: 'font-semibold text-highlighted' }, row.original.produk || '-'),
    h('div', { class: 'mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted' }, [
      h('span', {}, `Model: ${row.original.model || '-'}`),
      h('span', { class: 'font-mono text-toned' }, `SN: ${row.original.nomorSeri || '-'}`)
    ])
  ])
}, {
  accessorKey: 'jenisKartuKey',
  header: 'Jenis Kartu',
  cell: ({ row }) => h(USelect, {
    modelValue: row.original.jenisKartuKey || '',
    items: cardTypeItems,
    class: 'w-34',
    size: 'sm',
    color: row.original.jenisKartuKey ? 'neutral' : 'warning',
    disabled: isActionLoading.value,
    'onUpdate:modelValue': (value: string) => changeWarrantyCardType(row.original, value)
  })
}, {
  accessorKey: 'statusCetak',
  header: 'Status',
  cell: ({ row }) => h('div', { class: 'flex flex-col gap-1' }, [
    h(UBadge, {
      color: row.original.statusCetak === 'Printed' ? 'success' : 'neutral',
      variant: 'subtle',
      label: row.original.statusCetak === 'Printed' ? 'Printed' : 'Belum Dicetak',
      class: 'w-fit font-semibold'
    }),
    row.original.reprintCount
      ? h('span', { class: 'text-xs text-muted' }, `Reprint ${row.original.reprintCount}x`)
      : null
  ])
}]

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadWarrantyPrintQueue()
  }, 300)
})

watch(selectedLayoutType, () => {
  syncSettingsSelection()
})

watch(selectedLayoutId, () => {
  const layout = printLayouts.value.find((item) => item.id === selectedLayoutId.value)
  if (layout) setEditingLayout(layout)
})

onMounted(async () => {
  adminName.value = sessionStorage.getItem('admin_nama') || 'Admin'
  if (!sessionStorage.getItem('admin_token')) {
    await router.replace('/login')
    return
  }

  await Promise.all([
    loadPrintLayouts(false),
    loadWarrantyPrintQueue(false)
  ])
})

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

async function loadPrintLayouts(showToast = true) {
  isLayoutLoading.value = true

  try {
    const result = await callApi<PrintLayoutState>('getPrintLayouts')
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal memuat layout cetak')

    applyPrintLayoutState(result.data)
    if (showToast) notify('Layout cetak dimuat', 'success')
  } catch (error) {
    await handleApiError(error, 'Layout cetak belum bisa dimuat')
  } finally {
    isLayoutLoading.value = false
  }
}

async function loadWarrantyPrintQueue(showLoading = true) {
  if (showLoading) isQueueLoading.value = true
  alertState.value = showLoading
    ? {
        type: 'loading',
        title: 'Memuat antrean cetak',
        description: 'Mengambil item Disetujui dan verified dari Google Sheet.'
      }
    : null

  try {
    const result = await callApi<WarrantyPrintQueueResponse>('getWarrantyPrintQueue', {
      search: search.value.trim()
    })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal memuat antrean cetak')

    printQueue.value = result.data.rows || []
    pruneSelection()
    alertState.value = null
  } catch (error) {
    await handleApiError(error, 'Antrean cetak belum bisa dimuat')
  } finally {
    isQueueLoading.value = false
  }
}

async function saveWarrantyCardTypes(items: Array<{ idPengajuan: string, noItem: string | number, jenisKartu: string }>, successMessage: string) {
  isActionLoading.value = true
  alertState.value = {
    type: 'loading',
    title: 'Menyimpan jenis kartu',
    description: 'Perubahan akan ditulis ke sheet WarrantyCards.'
  }

  try {
    const result = await callApi<{ count: number }>('saveWarrantyCardTypes', { items })
    if (!result.success) throw new Error(result.error || 'Gagal menyimpan jenis kartu')

    alertState.value = {
      type: 'success',
      title: successMessage,
      description: `${result.data?.count || items.length} item berhasil diperbarui.`
    }
    notify(successMessage, 'success')
  } catch (error) {
    await handleApiError(error, 'Jenis kartu gagal disimpan')
    throw error
  } finally {
    isActionLoading.value = false
  }
}

async function changeWarrantyCardType(row: WarrantyPrintQueueRow, value: string) {
  if (!value || (value !== 'local' && value !== 'import')) return

  await saveWarrantyCardTypes([{
    idPengajuan: row.idPengajuan,
    noItem: row.noItem,
    jenisKartu: value
  }], 'Jenis kartu disimpan')

  updateRowsCardType([row.key], value)
}

async function setSelectedCardType(jenisKartu: CardTypeKey) {
  const rows = selectedRows.value
  if (!rows.length) {
    showInlineError('Pilih item terlebih dahulu')
    return
  }

  await saveWarrantyCardTypes(rows.map((row) => ({
    idPengajuan: row.idPengajuan,
    noItem: row.noItem,
    jenisKartu
  })), `Jenis kartu batch disimpan sebagai ${jenisKartu === 'local' ? 'Local' : 'Import'}`)

  updateRowsCardType(rows.map((row) => row.key), jenisKartu)
}

async function printSelectedWarrantyCards() {
  const rows = selectedRowsSorted.value
  if (!rows.length) {
    showInlineError('Pilih item yang ingin dicetak')
    return
  }

  if (!ensureRowsHaveCardType(rows)) return

  await loadPrintLayouts(false)
  printMode.value = 'warranty-cards'
  warrantyPrintRows.value = rows
  labelPrintRows.value = []
  alertState.value = {
    type: 'success',
    title: `${rows.length} kartu siap dicetak`,
    description: 'Dialog print browser akan terbuka. Status printed belum disimpan sampai Anda menandainya.'
  }
  await printAfterRender()
}

function openConfirmPrinted() {
  const rows = selectedRowsSorted.value
  if (!rows.length) {
    showInlineError('Pilih item yang sudah dicetak')
    return
  }

  if (!ensureRowsHaveCardType(rows)) return
  confirmPrintedOpen.value = true
}

async function markSelectedWarrantyCardsPrinted() {
  const rows = selectedRowsSorted.value
  if (!rows.length) return

  confirmPrintedOpen.value = false
  isActionLoading.value = true
  alertState.value = {
    type: 'loading',
    title: 'Menyimpan status cetak',
    description: 'Membuat batch dan menghapus item printed dari antrean normal.'
  }

  try {
    const result = await callApi<{ batchId: string, count: number }>('markWarrantyCardsPrinted', {
      items: rows.map((row) => ({
        idPengajuan: row.idPengajuan,
        noItem: row.noItem,
        jenisKartu: row.jenisKartuKey
      }))
    })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal menandai kartu tercetak')

    selectedPrintKeys.value = new Set()
    await loadWarrantyPrintQueue(false)
    alertState.value = {
      type: 'success',
      title: `Batch ${result.data.batchId} tersimpan`,
      description: `${result.data.count} kartu berhasil ditandai Printed.`,
      batchId: result.data.batchId
    }
    notify('Batch cetak tersimpan', 'success')
  } catch (error) {
    await handleApiError(error, 'Status cetak gagal disimpan')
  } finally {
    isActionLoading.value = false
  }
}

async function openShippingLabelPreview(batchId = '') {
  currentView.value = 'shipping-label'
  shippingLabels.value = []
  shippingLabelMeta.value = {
    batchId,
    search: batchId ? '' : search.value.trim(),
    totalItems: 0
  }
  alertState.value = {
    type: 'loading',
    title: 'Memuat data label',
    description: batchId ? `Mengambil item Printed untuk batch ${batchId}.` : 'Mengambil semua item Printed sesuai pencarian aktif.'
  }

  try {
    const result = await callApi<WarrantyPrintQueueResponse>('getWarrantyPrintQueue', {
      search: batchId ? '' : search.value.trim(),
      includePrinted: true
    })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal memuat data label')

    const printedRows = (result.data.rows || []).filter((row) =>
      row.statusCetak === 'Printed' && (!batchId || row.printBatchId === batchId)
    )

    shippingLabels.value = buildShippingLabels(printedRows)
    shippingLabelMeta.value = {
      batchId,
      search: batchId ? '' : search.value.trim(),
      totalItems: printedRows.length
    }

    if (!shippingLabels.value.length) {
      alertState.value = {
        type: 'error',
        title: 'Tidak ada item Printed untuk label cabang',
        description: 'Coba pilih batch lain atau kosongkan pencarian aktif.'
      }
    } else {
      alertState.value = null
    }
  } catch (error) {
    await handleApiError(error, 'Label cabang belum bisa dimuat')
  }
}

async function printShippingLabels() {
  if (!shippingLabels.value.length) {
    showInlineError('Tidak ada label untuk dicetak')
    return
  }

  printMode.value = 'shipping-labels'
  labelPrintRows.value = [...shippingLabels.value]
  warrantyPrintRows.value = []
  alertState.value = {
    type: 'success',
    title: `${shippingLabels.value.length} label siap dicetak`,
    description: 'Layout label memakai ukuran 60 x 50 mm, maksimal 15 label per halaman A4.'
  }
  await printAfterRender()
}

function buildShippingLabels(rows: WarrantyPrintQueueRow[]) {
  const groups = new Map<string, ShippingLabel>()
  rows.forEach((row) => {
    const cabang = String(row.bagianCabang || '').trim() || 'Tanpa Cabang'
    const key = cabang.toLowerCase()
    if (!groups.has(key)) groups.set(key, { cabang, qty: 0 })
    groups.get(key)!.qty += 1
  })

  return Array.from(groups.values()).sort((a, b) => a.cabang.localeCompare(b.cabang, 'id-ID'))
}

function chunkLabels(labels: ShippingLabel[]) {
  const pages: ShippingLabel[][] = []
  for (let index = 0; index < labels.length; index += 15) {
    pages.push(labels.slice(index, index + 15))
  }
  return pages
}

function backToQueue() {
  currentView.value = 'queue'
}

function addPrintLayout() {
  selectedLayoutId.value = ''
  setEditingLayout(createEmptyPrintLayout(selectedLayoutType.value))
}

function duplicateActivePrintLayout() {
  const active = getActivePrintLayout(selectedLayoutType.value)
  setEditingLayout({
    ...active,
    id: '',
    name: `${active.name || 'Layout'} Copy`,
    isBuiltin: false
  })
  selectedLayoutId.value = ''
}

async function savePrintLayoutForm() {
  const layout = normalizeEditingLayout()
  if (!layout) return

  isLayoutLoading.value = true
  try {
    const result = await callApi<PrintLayoutState>('savePrintLayout', { layout })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal menyimpan layout')

    applyPrintLayoutState(result.data)
    selectedLayoutId.value = result.data.savedLayoutId || layout.id
    notify('Layout berhasil disimpan', 'success')
  } catch (error) {
    await handleApiError(error, 'Layout gagal disimpan')
  } finally {
    isLayoutLoading.value = false
  }
}

async function setActivePrintLayoutFromForm() {
  if (!editingLayout.value.id) {
    showInlineError('Simpan layout terlebih dahulu sebelum dijadikan aktif')
    return
  }

  isLayoutLoading.value = true
  try {
    const result = await callApi<PrintLayoutState>('setActivePrintLayout', {
      type: selectedLayoutType.value,
      id: editingLayout.value.id
    })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal mengubah layout aktif')

    applyPrintLayoutState(result.data)
    selectedLayoutId.value = editingLayout.value.id
    notify('Layout aktif berhasil diperbarui', 'success')
  } catch (error) {
    await handleApiError(error, 'Layout aktif gagal diperbarui')
  } finally {
    isLayoutLoading.value = false
  }
}

async function deletePrintLayoutFromForm() {
  if (!editingLayout.value.id || editingLayout.value.isBuiltin) return
  if (!window.confirm('Hapus layout custom ini?')) return

  isLayoutLoading.value = true
  try {
    const result = await callApi<PrintLayoutState>('deletePrintLayout', { id: editingLayout.value.id })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal menghapus layout')

    applyPrintLayoutState(result.data)
    syncSettingsSelection()
    notify('Layout berhasil dihapus', 'success')
  } catch (error) {
    await handleApiError(error, 'Layout gagal dihapus')
  } finally {
    isLayoutLoading.value = false
  }
}

function normalizeEditingLayout() {
  const layout = {
    ...editingLayout.value,
    type: selectedLayoutType.value,
    name: String(editingLayout.value.name || '').trim(),
    offsetX: Number(editingLayout.value.offsetX || 0),
    offsetY: Number(editingLayout.value.offsetY || 0),
    gapProductModel: Number(editingLayout.value.gapProductModel || 0),
    gapModelSerial: Number(editingLayout.value.gapModelSerial || 0)
  }

  if (!layout.name) {
    showInlineError('Nama layout wajib diisi')
    return null
  }

  if (![layout.offsetX, layout.offsetY, layout.gapProductModel, layout.gapModelSerial].every(Number.isFinite)) {
    showInlineError('Semua nilai posisi harus berupa angka')
    return null
  }

  if (layout.gapProductModel < 0 || layout.gapModelSerial < 0) {
    showInlineError('Nilai gap minimal 0')
    return null
  }

  return layout
}

function syncSettingsSelection() {
  const activeId = activePrintLayoutIds.value[selectedLayoutType.value]
  const layouts = printLayouts.value.filter((layout) => layout.type === selectedLayoutType.value)
  const fallbackId = layouts[0]?.id || ''
  selectedLayoutId.value = activeId || fallbackId

  const layout = layouts.find((item) => item.id === selectedLayoutId.value)
  setEditingLayout(layout || createEmptyPrintLayout(selectedLayoutType.value))
}

function setEditingLayout(layout: PrintLayout) {
  editingLayout.value = {
    ...layout,
    offsetX: Number(layout.offsetX || 0),
    offsetY: Number(layout.offsetY || 0),
    gapProductModel: Number(layout.gapProductModel || 0),
    gapModelSerial: Number(layout.gapModelSerial || 0)
  }
}

function applyPrintLayoutState(data: PrintLayoutState) {
  printLayouts.value = data.layouts || []
  activePrintLayoutIds.value = data.active || {
    local: 'local-default',
    import: 'import-default'
  }
  activePrintLayouts.value = data.activeLayouts || {
    local: null,
    import: null
  }
  syncSettingsSelection()
}

function getActivePrintLayout(type: CardTypeKey) {
  return activePrintLayouts.value[type]
    || printLayouts.value.find((layout) => layout.id === `${type}-default` && layout.type === type)
    || createEmptyPrintLayout(type)
}

function createEmptyPrintLayout(type: CardTypeKey): PrintLayout {
  return {
    id: '',
    type,
    name: '',
    offsetX: 0,
    offsetY: 0,
    gapProductModel: 0,
    gapModelSerial: 0,
    isBuiltin: false
  }
}

function handlePrintRowCheck(key: string, checked: boolean) {
  const next = new Set(selectedPrintKeys.value)
  if (checked) next.add(key)
  else next.delete(key)
  selectedPrintKeys.value = next
}

function toggleVisiblePrintRows(checked: boolean) {
  const next = new Set(selectedPrintKeys.value)
  visibleKeys.value.forEach((key) => {
    if (checked) next.add(key)
    else next.delete(key)
  })
  selectedPrintKeys.value = next
}

function pruneSelection() {
  const activeKeys = new Set(printQueue.value.map((row) => row.key))
  selectedPrintKeys.value = new Set(Array.from(selectedPrintKeys.value).filter((key) => activeKeys.has(key)))
}

function updateRowsCardType(keys: string[], jenisKartu: CardTypeKey) {
  const keySet = new Set(keys)
  printQueue.value = printQueue.value.map((row) => {
    if (!keySet.has(row.key)) return row
    return {
      ...row,
      jenisKartuKey: jenisKartu,
      jenisKartu: jenisKartu === 'local' ? 'Local' : 'Import'
    }
  })
}

function ensureRowsHaveCardType(rows: WarrantyPrintQueueRow[]) {
  const missing = rows.filter((row) => !row.jenisKartuKey)
  if (missing.length) {
    showInlineError(`${missing.length} item belum dipilih jenis kartunya`)
    return false
  }
  return true
}

async function printAfterRender() {
  await nextTick()
  window.setTimeout(() => {
    document.body.classList.add('is-warranty-printing')
    window.print()
  }, 100)
}

function getWarrantyPageStyle(row: WarrantyPrintQueueRow) {
  const cardType = row.jenisKartuKey === 'import' ? 'import' : 'local'
  const layout = getActivePrintLayout(cardType)
  return {
    '--warranty-adjust-x': `${layout.offsetX}mm`,
    '--warranty-adjust-y': `${layout.offsetY}mm`,
    '--warranty-gap-product-model': `${layout.gapProductModel}mm`,
    '--warranty-gap-model-serial': `${layout.gapModelSerial}mm`
  }
}

function getLayoutMetric(layout: PrintLayout) {
  return `X ${layout.offsetX}mm, Y ${layout.offsetY}mm, Produk ke Model ${layout.gapProductModel}mm, Model ke Serial ${layout.gapModelSerial}mm`
}

function getAlertColor(type: NonNullable<AlertState>['type']) {
  const colors = {
    success: 'success',
    error: 'error',
    info: 'info',
    loading: 'info'
  } as const

  return colors[type]
}

function getAlertIcon(type: NonNullable<AlertState>['type']) {
  const icons = {
    success: 'i-lucide-circle-check',
    error: 'i-lucide-circle-alert',
    info: 'i-lucide-info',
    loading: 'i-lucide-loader-circle'
  } as const

  return icons[type]
}

function showInlineError(message: string) {
  alertState.value = {
    type: 'error',
    title: message
  }
  notify(message, 'error')
}

function notify(title: string, color: 'success' | 'error' | 'info') {
  toast.add({
    title,
    color,
    icon: color === 'success' ? 'i-lucide-circle-check' : color === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-info'
  })
}

async function handleApiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || fallback)
  alertState.value = {
    type: 'error',
    title: fallback,
    description: message
  }
  notify(message, 'error')

  if (message.includes('Unauthorized')) {
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_nama')
    sessionStorage.removeItem('admin_username')
    await router.push('/login')
  }
}

if (import.meta.client) {
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-warranty-printing')
  })
}

</script>

<template>
  <div class="contents">
    <UDashboardPanel id="cetak-kartu">
    <template #header>
      <UDashboardNavbar title="Cetak Kartu Garansi" :description="`Halo, ${adminName}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="currentView !== 'queue'"
              label="Kembali ke Antrean"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              @click="backToQueue"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="currentView === 'queue'" class="space-y-6">
        <CetakKartuStats
          :summary="visibleSummary"
          :selected-count="selectedPrintKeys.size"
          :loading="isQueueLoading"
        />

        <section class="grid gap-4 md:grid-cols-2">
          <UPageCard
            v-for="type in ['local', 'import'] as const"
            :key="type"
            :title="`${type === 'local' ? 'Local' : 'Import'} aktif`"
            :description="getLayoutMetric(getActivePrintLayout(type))"
            icon="i-lucide-ruler"
            variant="subtle"
          />
        </section>

        <section class="relative rounded-lg border border-muted bg-default/45 shadow-sm backdrop-blur-xl">
          <div class="min-h-0 w-full overflow-x-auto">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-accented px-4 py-3.5">
              <UInput
                v-model="search"
                class="w-full max-w-sm"
                icon="i-lucide-search"
                placeholder="Cari ID, cabang, nama, produk, model, atau serial..."
              />

              <div class="flex flex-wrap items-center gap-2">
                <USelect
                  v-model="cardTypeFilter"
                  :items="cardTypeFilterItems"
                  class="w-full sm:w-44"
                  :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
                />

                <UButton
                  label="Refresh"
                  icon="i-lucide-refresh-cw"
                  color="neutral"
                  variant="soft"
                  :loading="isQueueLoading"
                  @click="loadWarrantyPrintQueue()"
                />
                <UButton
                  label="Preview Label"
                  icon="i-lucide-tags"
                  color="neutral"
                  variant="soft"
                  @click="openShippingLabelPreview()"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-accented px-4 py-3">
              <p class="text-sm text-muted">
                {{ selectedRows.length }} dari {{ visiblePrintRows.length }} item tampil dipilih.
              </p>

              <div class="flex flex-wrap items-center gap-2">
                <UButton
                  label="Set Local"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  :disabled="!selectedRows.length || isActionLoading"
                  @click="setSelectedCardType('local')"
                />
                <UButton
                  label="Set Import"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  :disabled="!selectedRows.length || isActionLoading"
                  @click="setSelectedCardType('import')"
                />
                <UButton
                  label="Cetak"
                  icon="i-lucide-printer"
                  color="primary"
                  size="sm"
                  :disabled="!selectedRows.length || isActionLoading"
                  @click="printSelectedWarrantyCards"
                />
                <UButton
                  label="Tandai Printed"
                  icon="i-lucide-circle-check"
                  color="success"
                  variant="soft"
                  size="sm"
                  :disabled="!selectedRows.length || isActionLoading"
                  @click="openConfirmPrinted"
                />
              </div>
            </div>

            <UAlert
              v-if="alertState"
              :color="getAlertColor(alertState.type)"
              :icon="getAlertIcon(alertState.type)"
              :title="alertState.title"
              :description="alertState.description"
              variant="subtle"
              class="m-4"
            >
              <template v-if="alertState.batchId" #actions>
                <UButton
                  label="Cetak Label Cabang"
                  icon="i-lucide-tags"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  @click="openShippingLabelPreview(alertState.batchId || '')"
                />
              </template>
            </UAlert>

            <UTable
              :data="visiblePrintRows"
              :columns="warrantyColumns"
              :loading="isQueueLoading"
              class="w-full"
              :ui="{
                root: 'w-full',
                base: 'w-full min-w-190 table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/45 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                tr: 'transition-colors hover:bg-elevated/30',
                th: 'border-b border-muted px-4 py-3 text-xs font-semibold uppercase text-muted',
                td: 'border-b border-muted px-4 py-4 text-sm align-middle',
                separator: 'h-0'
              }"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <UIcon
                    :name="queueLoadError ? 'i-lucide-circle-alert' : 'i-lucide-inbox'"
                    class="size-8 text-muted"
                  />
                  <p class="text-sm font-medium text-highlighted">
                    {{ queueLoadError ? 'Antrean cetak belum bisa dimuat' : 'Tidak ada item siap cetak' }}
                  </p>
                  <p v-if="queueLoadError" class="max-w-md text-sm text-muted">
                    {{ queueLoadError }}
                  </p>
                </div>
              </template>
            </UTable>
          </div>
        </section>
      </div>

      <section v-else-if="currentView === 'settings'" class="space-y-6 rounded-lg border border-muted bg-default/45 p-4 shadow-sm backdrop-blur-xl">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              Setting Layout Cetak
            </h2>
            <p class="text-sm text-muted">
              Atur offset dan jarak field kartu garansi untuk Local dan Import.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              label="Tambah Layout"
              icon="i-lucide-plus"
              color="neutral"
              variant="soft"
              @click="addPrintLayout"
            />
            <UButton
              label="Duplikasi Aktif"
              icon="i-lucide-copy"
              color="neutral"
              variant="soft"
              @click="duplicateActivePrintLayout"
            />
          </div>
        </div>

        <UAlert
          v-if="alertState"
          :color="getAlertColor(alertState.type)"
          :icon="getAlertIcon(alertState.type)"
          :title="alertState.title"
          :description="alertState.description"
          variant="subtle"
        />

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Jenis Layout">
            <USelect v-model="selectedLayoutType" :items="layoutTypeItems" class="w-full" />
          </UFormField>

          <UFormField label="Layout">
            <USelect v-model="selectedLayoutId" :items="layoutOptions" class="w-full" />
          </UFormField>

          <UFormField label="Nama Layout" class="md:col-span-2">
            <UInput v-model="editingLayout.name" class="w-full" placeholder="Nama layout" />
          </UFormField>

          <UFormField label="Offset X (mm)">
            <UInput v-model.number="editingLayout.offsetX" type="number" step="0.1" class="w-full" />
          </UFormField>

          <UFormField label="Offset Y (mm)">
            <UInput v-model.number="editingLayout.offsetY" type="number" step="0.1" class="w-full" />
          </UFormField>

          <UFormField label="Gap Produk ke Model (mm)">
            <UInput v-model.number="editingLayout.gapProductModel" type="number" min="0" step="0.1" class="w-full" />
          </UFormField>

          <UFormField label="Gap Model ke Serial (mm)">
            <UInput v-model.number="editingLayout.gapModelSerial" type="number" min="0" step="0.1" class="w-full" />
          </UFormField>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            label="Hapus"
            icon="i-lucide-trash-2"
            color="error"
            variant="soft"
            :disabled="!editingLayout.id || editingLayout.isBuiltin || isLayoutLoading"
            @click="deletePrintLayoutFromForm"
          />
          <UButton
            label="Jadikan Aktif"
            icon="i-lucide-check"
            color="neutral"
            variant="soft"
            :disabled="!editingLayout.id || isLayoutLoading"
            @click="setActivePrintLayoutFromForm"
          />
          <UButton
            label="Simpan Layout"
            icon="i-lucide-save"
            color="primary"
            :loading="isLayoutLoading"
            @click="savePrintLayoutForm"
          />
        </div>
      </section>

      <section v-else-if="currentView === 'shipping-label'" class="space-y-6">
        <div class="grid gap-4 md:grid-cols-3">
          <UPageCard title="Cabang" :description="`${shippingLabelSummary.branches} label`" icon="i-lucide-building-2" variant="subtle" />
          <UPageCard title="Qty Item Produk" :description="`${shippingLabelSummary.totalQty} item printed`" icon="i-lucide-package-check" variant="subtle" />
          <UPageCard title="Ukuran Label" :description="shippingLabelSummary.size" icon="i-lucide-ruler" variant="subtle" />
        </div>

        <section class="rounded-lg border border-muted bg-default/45 p-4 shadow-sm backdrop-blur-xl">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">
                Preview Label Cabang
              </h2>
              <p class="text-sm text-muted">
                {{ shippingLabelMeta.batchId ? `Batch ${shippingLabelMeta.batchId}` : 'Semua item Printed sesuai pencarian aktif' }} · {{ shippingLabelMeta.totalItems }} item
              </p>
            </div>

            <UButton
              label="Cetak Label"
              icon="i-lucide-printer"
              color="primary"
              :disabled="!shippingLabels.length"
              @click="printShippingLabels"
            />
          </div>

          <UAlert
            v-if="alertState"
            :color="getAlertColor(alertState.type)"
            :icon="getAlertIcon(alertState.type)"
            :title="alertState.title"
            :description="alertState.description"
            variant="subtle"
            class="mb-4"
          />

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <UPageCard
              v-for="label in shippingLabels"
              :key="label.cabang"
              :title="label.cabang"
              :description="`${label.qty} item produk`"
              icon="i-lucide-tag"
              variant="subtle"
            />
          </div>
        </section>
      </section>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="confirmPrintedOpen" title="Tandai kartu sudah dicetak?" description="Item terpilih akan disimpan sebagai Printed dan dibuatkan batch cetak.">
    <template #body>
      <p class="text-sm text-muted">
        {{ selectedRowsSorted.length }} kartu akan ditandai sudah dicetak. Pastikan proses cetak fisik sudah selesai.
      </p>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="ghost" @click="confirmPrintedOpen = false" />
        <UButton label="Tandai Printed" color="success" :loading="isActionLoading" @click="markSelectedWarrantyCardsPrinted" />
      </div>
    </template>
  </UModal>

  <div class="warranty-print-root">
    <template v-if="printMode === 'warranty-cards'">
      <section
        v-for="row in warrantyPrintRows"
        :key="row.key"
        class="warranty-print-page"
        :class="row.jenisKartuKey === 'import' ? 'import' : 'local'"
        :style="getWarrantyPageStyle(row)"
      >
        <div class="warranty-field warranty-detail-field warranty-product">
          {{ row.produk }}
        </div>
        <div class="warranty-field warranty-detail-field warranty-model">
          {{ row.model }}
        </div>
        <div class="warranty-field warranty-detail-field warranty-serial">
          {{ row.nomorSeri }}
        </div>
      </section>
    </template>

    <template v-else>
      <section
        v-for="(page, pageIndex) in chunkLabels(labelPrintRows)"
        :key="pageIndex"
        class="shipping-label-print-page shipping-label-sheet"
      >
        <article v-for="label in page" :key="label.cabang" class="shipping-label-card">
          <div class="shipping-label-branch">
            {{ label.cabang }}
          </div>
          <div class="shipping-label-qty-row">
            <span>QTY ITEM</span>
            <strong>{{ label.qty }}</strong>
          </div>
        </article>
      </section>
    </template>
  </div>
  </div>
</template>

<style scoped>
.warranty-print-root {
  display: none;
}

.warranty-print-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  background: #fff;
  color: #000;
  --warranty-adjust-x: 0mm;
  --warranty-adjust-y: 0mm;
  --warranty-gap-product-model: 0mm;
  --warranty-gap-model-serial: 0mm;
}

.warranty-print-page.local {
  --warranty-base-x: 5mm;
  --warranty-base-y: -5mm;
  --warranty-detail-base-y: -2mm;
}

.warranty-print-page.import {
  --warranty-base-x: 0mm;
  --warranty-base-y: 3mm;
  --warranty-detail-base-y: 0mm;
}

.warranty-field {
  position: absolute;
  transform: translate(
    calc(var(--warranty-base-x, 0mm) + var(--warranty-adjust-x, 0mm)),
    calc(var(--warranty-base-y, 0mm) + var(--warranty-adjust-y, 0mm))
  );
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  font-family: Arial, sans-serif;
  color: #000;
}

.warranty-detail-field {
  transform: translate(
    calc(var(--warranty-base-x, 0mm) + var(--warranty-adjust-x, 0mm)),
    calc(
      var(--warranty-base-y, 0mm) + var(--warranty-adjust-y, 0mm) +
      var(--warranty-detail-base-y, 0mm) +
      var(--warranty-field-gap-y, 0mm)
    )
  );
}

.warranty-product {
  left: 0mm;
  top: 218.3mm;
  width: 124.6mm;
  height: 6.4mm;
  font-size: 14pt;
  line-height: 6.4mm;
}

.warranty-model {
  left: 0mm;
  top: 236.3mm;
  width: 61.1mm;
  --warranty-field-gap-y: var(--warranty-gap-product-model);
  height: 5.3mm;
  font-size: 10pt;
  line-height: 5.3mm;
}

.warranty-serial {
  left: 73.3mm;
  top: 236.3mm;
  width: 51.3mm;
  --warranty-field-gap-y: calc(var(--warranty-gap-product-model) + var(--warranty-gap-model-serial));
  height: 5.3mm;
  font-size: 10pt;
  line-height: 5.3mm;
}

.shipping-label-sheet {
  width: 210mm;
  min-height: 297mm;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(3, 60mm);
  grid-auto-rows: 50mm;
  align-content: start;
  justify-content: center;
  gap: 4mm 5mm;
  padding: 10mm;
  background: #fff;
  color: #0f172a;
}

.shipping-label-card {
  width: 60mm;
  height: 50mm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  break-inside: avoid;
  page-break-inside: avoid;
  border: 1px solid #cbd5e1;
  padding: 5mm 4mm;
  background: #fff;
  font-family: Arial, sans-serif;
}

.shipping-label-branch {
  overflow-wrap: anywhere;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 0;
  text-transform: uppercase;
}

.shipping-label-qty-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2mm;
  border-top: 1px solid #cbd5e1;
  padding-top: 3mm;
}

.shipping-label-qty-row span {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #475569;
}

.shipping-label-qty-row strong {
  font-size: 32px;
  font-weight: 800;
  line-height: 0.85;
  color: #0f172a;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  :global(body.is-warranty-printing) {
    background: #fff !important;
  }

  :global(body.is-warranty-printing *) {
    visibility: hidden !important;
  }

  :global(body.is-warranty-printing .warranty-print-root),
  :global(body.is-warranty-printing .warranty-print-root *) {
    visibility: visible !important;
  }

  :global(body.is-warranty-printing .warranty-print-root) {
    display: block !important;
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    background: #fff !important;
  }

  .warranty-print-page,
  .shipping-label-print-page {
    page-break-after: always;
    break-after: page;
  }

  .warranty-print-page:last-child,
  .shipping-label-print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
</style>
