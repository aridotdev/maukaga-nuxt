<script setup lang="ts">
import type { AlertState, ShippingLabel, WarrantyPrintQueueResponse } from '~/types/print'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const { callApi } = useAppsScriptApi()

const adminName = ref('Admin')
const search = ref('')
const batchId = ref('')
const shippingLabels = ref<ShippingLabel[]>([])
const labelPrintRows = ref<ShippingLabel[]>([])
const totalPrintedItems = ref(0)
const isLoading = ref(false)
const alertState = ref<AlertState>(null)
const labelPrintRef = ref<{ print: () => Promise<void> } | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

const shippingLabelSummary = computed(() => {
  const totalQty = shippingLabels.value.reduce((sum, label) => sum + Number(label.qty || 0), 0)

  return {
    branches: shippingLabels.value.length,
    totalQty,
    size: '60 x 50 mm'
  }
})

const previewDescription = computed(() => {
  if (batchId.value) return `Batch ${batchId.value}`
  if (search.value.trim()) return `Hasil pencarian "${search.value.trim()}"`
  return 'Semua item Printed'
})

watch(search, () => {
  if (batchId.value) return
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    loadShippingLabels()
  }, 300)
})

onMounted(async () => {
  adminName.value = sessionStorage.getItem('admin_nama') || 'Admin'
  if (!sessionStorage.getItem('admin_token')) {
    await router.replace('/login')
    return
  }

  batchId.value = String(route.query.batchId || '')
  await loadShippingLabels(false)
})

async function loadShippingLabels(showLoading = true) {
  if (showLoading) isLoading.value = true
  alertState.value = showLoading
    ? {
        type: 'loading',
        title: 'Memuat data label',
        description: batchId.value ? `Mengambil item Printed untuk batch ${batchId.value}.` : 'Mengambil semua item Printed sesuai pencarian aktif.'
      }
    : null

  try {
    const result = await callApi<WarrantyPrintQueueResponse>('getWarrantyPrintQueue', {
      search: batchId.value ? '' : search.value.trim(),
      includePrinted: true
    })
    if (!result.success || !result.data) throw new Error(result.error || 'Gagal memuat data label')

    const printedRows = (result.data.rows || []).filter((row) =>
      row.statusCetak === 'Printed' && (!batchId.value || row.printBatchId === batchId.value)
    )

    shippingLabels.value = buildShippingLabels(printedRows)
    totalPrintedItems.value = printedRows.length

    if (!shippingLabels.value.length) {
      alertState.value = {
        type: 'error',
        title: 'Tidak ada item Printed untuk label pengiriman',
        description: 'Coba pilih batch lain atau kosongkan pencarian aktif.'
      }
    } else {
      alertState.value = null
    }
  } catch (error) {
    await handleApiError(error, 'Label pengiriman belum bisa dimuat')
  } finally {
    isLoading.value = false
  }
}

async function clearBatchFilter() {
  batchId.value = ''
  await router.replace('/dashboard/cetak-label-pengiriman')
  await loadShippingLabels()
}

async function printShippingLabels() {
  if (!shippingLabels.value.length) {
    showInlineError('Tidak ada label untuk dicetak')
    return
  }

  labelPrintRows.value = [...shippingLabels.value]
  alertState.value = {
    type: 'success',
    title: `${shippingLabels.value.length} label siap dicetak`,
    description: 'Layout label memakai ukuran 60 x 50 mm, maksimal 15 label per halaman A4.'
  }
  await labelPrintRef.value?.print()
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
    <UDashboardPanel id="cetak-label-pengiriman">
      <template #header>
        <UDashboardNavbar title="Cetak Label Pengiriman" :description="`Halo, ${adminName}`">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="space-y-6">
          <div class="grid gap-4 md:grid-cols-3">
            <UPageCard title="Cabang" :description="`${shippingLabelSummary.branches} label`" icon="i-lucide-building-2" variant="subtle" />
            <UPageCard title="Qty Item Produk" :description="`${shippingLabelSummary.totalQty} item printed`" icon="i-lucide-package-check" variant="subtle" />
            <UPageCard title="Ukuran Label" :description="shippingLabelSummary.size" icon="i-lucide-ruler" variant="subtle" />
          </div>

          <section class="rounded-lg border border-muted bg-default/45 p-4 shadow-sm backdrop-blur-xl">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Preview Label Pengiriman
                </h2>
                <p class="text-sm text-muted">
                  {{ previewDescription }} - {{ totalPrintedItems }} item
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UInput
                  v-model="search"
                  class="w-full sm:w-72"
                  icon="i-lucide-search"
                  placeholder="Cari batch, cabang, nama, produk..."
                  :disabled="!!batchId"
                />
                <UButton
                  v-if="batchId"
                  label="Semua Printed"
                  icon="i-lucide-list-restart"
                  color="neutral"
                  variant="soft"
                  @click="clearBatchFilter"
                />
                <UButton
                  label="Refresh"
                  icon="i-lucide-refresh-cw"
                  color="neutral"
                  variant="soft"
                  :loading="isLoading"
                  @click="loadShippingLabels()"
                />
                <UButton
                  label="Cetak Label"
                  icon="i-lucide-printer"
                  color="primary"
                  :disabled="!shippingLabels.length"
                  @click="printShippingLabels"
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
              class="mb-4"
            />

            <div v-if="shippingLabels.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <UPageCard
                v-for="label in shippingLabels"
                :key="label.cabang"
                :title="label.cabang"
                :description="`${label.qty} item produk`"
                icon="i-lucide-tag"
                variant="subtle"
              />
            </div>

            <div v-else-if="!isLoading" class="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <UIcon name="i-lucide-tags" class="size-8 text-muted" />
              <p class="text-sm font-medium text-highlighted">
                Belum ada label untuk ditampilkan
              </p>
            </div>
          </section>
        </div>
      </template>
    </UDashboardPanel>

    <PrintLabelPengiriman ref="labelPrintRef" :labels="labelPrintRows" />
  </div>
</template>
