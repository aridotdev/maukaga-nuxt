<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  AlertState,
  CardTypeFilter,
  CardTypeKey,
  PrintLayout,
  PrintLayoutState,
  WarrantyPrintQueueResponse,
  WarrantyPrintQueueRow
} from '~/types/print'

const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')
const USelect = resolveComponent('USelect')

const toast = useToast()
const router = useRouter()
const { callApi } = useAppsScriptApi()

const adminName = ref('Admin')
const printQueue = ref<WarrantyPrintQueueRow[]>([])
const selectedPrintKeys = ref<Set<string>>(new Set())
const search = ref('')
const cardTypeFilter = ref<CardTypeFilter>('all')
const isQueueLoading = ref(false)
const isActionLoading = ref(false)
const alertState = ref<AlertState>(null)
const confirmPrintedOpen = ref(false)
const activePrintLayouts = ref<Record<CardTypeKey, PrintLayout | null>>({
  local: null,
  import: null
})
const warrantyPrintRows = ref<WarrantyPrintQueueRow[]>([])
const warrantyPrintRef = ref<{ print: () => Promise<void> } | null>(null)

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

const batchLabelRoute = computed(() => {
  const batchId = alertState.value?.batchId

  return batchId
    ? { path: '/dashboard/cetak-label-pengiriman', query: { batchId } }
    : '/dashboard/cetak-label-pengiriman'
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

onMounted(async () => {
  adminName.value = sessionStorage.getItem('admin_nama') || 'Admin'
  if (!sessionStorage.getItem('admin_token')) {
    await router.replace('/login')
    return
  }

  await Promise.all([
    loadPrintLayouts(),
    loadWarrantyPrintQueue(false)
  ])
})

async function loadPrintLayouts() {
  try {
    const result = await callApi<PrintLayoutState>('getPrintLayouts')
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal memuat layout cetak')

    activePrintLayouts.value = result.data.activeLayouts || {
      local: null,
      import: null
    }
  } catch (error) {
    await handleApiError(error, 'Layout cetak belum bisa dimuat')
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

  await loadPrintLayouts()
  warrantyPrintRows.value = rows
  alertState.value = {
    type: 'success',
    title: `${rows.length} kartu siap dicetak`,
    description: 'Dialog print browser akan terbuka. Status printed belum disimpan sampai Anda menandainya.'
  }
  await warrantyPrintRef.value?.print()
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
</script>

<template>
  <div class="contents">
    <UDashboardPanel id="cetak-kartu">
      <template #header>
        <UDashboardNavbar title="Cetak Kartu Garansi" :description="`Halo, ${adminName}`">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="space-y-6">
          <PrintCetakKartuStats
            :summary="visibleSummary"
            :selected-count="selectedPrintKeys.size"
            :loading="isQueueLoading"
          />

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
                    :to="batchLabelRoute"
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

    <PrintKartuGaransi
      ref="warrantyPrintRef"
      :rows="warrantyPrintRows"
      :active-layouts="activePrintLayouts"
    />
  </div>
</template>
