<script setup lang="ts">
type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type ReviewQueueItem = {
  idPengajuan?: string
  noItem?: number | string
  produk?: string
  model?: string
  nomorSeri?: string
  statusPengajuan?: string
  bagianCabang?: string
}

type ProductOption = {
  produk: string
  count: number
}

type ReviewQueueGroup = {
  modelNormalized: string
  modelDisplay?: string
  produk?: string
  count: number
  items?: ReviewQueueItem[]
  produkOptions?: ProductOption[]
}

type ReviewQueueResponse = {
  rows: ReviewQueueGroup[]
}

type ApproveResponse = {
  modelNormalized: string
  produk: string
  count: number
}

const runtimeConfig = useRuntimeConfig()
const router = useRouter()
const toast = useToast()

const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))
const rows = ref<ReviewQueueGroup[]>([])
const productInputs = ref<Record<string, string>>({})
const approvingModels = ref<Record<string, boolean>>({})
const isLoading = ref(false)
const loadError = ref('')
const showAll = ref(false)

const pendingCount = computed(() => rows.value.reduce((total, group) => total + Number(group.count || 0), 0))
const visibleRows = computed(() => showAll.value ? rows.value : rows.value.slice(0, 3))

onMounted(() => {
  loadReviewQueue()
})

async function loadReviewQueue() {
  isLoading.value = true
  loadError.value = ''

  try {
    const result = await callAdminApi<ReviewQueueResponse>('getProductReviewQueue')
    const nextRows = result.data?.rows || []

    rows.value = nextRows
    productInputs.value = nextRows.reduce<Record<string, string>>((inputs, group) => {
      const key = getGroupKey(group)
      inputs[key] = productInputs.value[key] ?? group.produk ?? getTopProductOption(group) ?? ''
      return inputs
    }, {})
  } catch (error) {
    const message = getErrorMessage(error)
    rows.value = []
    loadError.value = message

    if (message.includes('Unauthorized') || message.includes('Token admin')) {
      clearAdminSession()
      await router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

async function approveGroup(group: ReviewQueueGroup) {
  const key = getGroupKey(group)
  const produk = String(productInputs.value[key] || '').trim()

  if (!produk) {
    toast.add({
      title: 'Nama Produk wajib diisi',
      description: 'Isi nama produk yang benar sebelum approve.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert'
    })
    return
  }

  approvingModels.value[key] = true

  try {
    const result = await callAdminApi<ApproveResponse>('approveModelProduk', {
      modelNormalized: group.modelNormalized,
      modelDisplay: group.modelDisplay || group.modelNormalized,
      produk
    })

    toast.add({
      title: 'Nama Produk disetujui',
      description: `${Number(result.data?.count || 0)} item diverifikasi untuk ${group.modelDisplay || group.modelNormalized}.`,
      color: 'success',
      icon: 'i-lucide-circle-check'
    })

    await loadReviewQueue()
  } catch (error) {
    const message = getErrorMessage(error)

    toast.add({
      title: 'Approval gagal',
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })

    if (message.includes('Unauthorized')) {
      clearAdminSession()
      await router.push('/login')
    }
  } finally {
    approvingModels.value[key] = false
  }
}

async function callAdminApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  if (!appsScriptApiUrl.value) throw new Error('URL Google Apps Script belum dikonfigurasi.')

  const token = sessionStorage.getItem('admin_token')
  if (!token) throw new Error('Token admin tidak ditemukan. Login dashboard terlebih dahulu.')

  const response = await fetch(appsScriptApiUrl.value, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, ...payload })
  })

  if (!response.ok) throw new Error(`Google Apps Script merespons ${response.status}.`)

  const result = await response.json() as ApiResult<T>
  if (!result.success) throw new Error(result.error || 'Request Google Apps Script gagal.')

  return result
}

function getGroupKey(group: ReviewQueueGroup) {
  return group.modelNormalized || group.modelDisplay || ''
}

function getTopProductOption(group: ReviewQueueGroup) {
  return group.produkOptions?.[0]?.produk || ''
}

function clearAdminSession() {
  sessionStorage.removeItem('admin_token')
  sessionStorage.removeItem('admin_nama')
  sessionStorage.removeItem('admin_username')
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <UCard
    class="flex w-full shrink-0 flex-col lg:max-w-md"
    :ui="{
      root: 'overflow-hidden',
      header: 'pb-4',
      body: 'flex min-h-0 flex-1 flex-col gap-4 pt-0',
      footer: 'pt-4'
    }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-highlighted">
            Antrean Review Produk
          </h2>
          <p class="mt-1 text-xs text-muted">
            Model baru menunggu verifikasi
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <UBadge
            color="warning"
            variant="subtle"
            :label="`${pendingCount} Pending`"
            class="font-semibold"
          />

          <UTooltip text="Refresh review">
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              :loading="isLoading"
              :disabled="isLoading"
              @click="loadReviewQueue"
            />
          </UTooltip>
        </div>
      </div>
    </template>

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Review Nama Produk belum bisa dimuat"
      :description="loadError"
    />

    <div
      v-if="isLoading && !rows.length"
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="h-32 rounded-lg"
      />
    </div>

    <div
      v-else-if="!rows.length && !loadError"
      class="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-muted bg-elevated/30 px-4 py-10 text-center"
    >
      <UIcon
        name="i-lucide-circle-check"
        class="size-9 text-muted"
      />
      <p class="mt-3 text-sm font-medium text-highlighted">
        Tidak ada produk yang perlu direview
      </p>
      <p class="mt-1 text-xs text-muted">
        Item verified akan lanjut ke antrean cetak.
      </p>
    </div>

    <div
      v-else
      class="flex max-h-116 flex-col gap-3 overflow-y-auto pr-1"
    >
      <div
        v-for="group in visibleRows"
        :key="getGroupKey(group)"
        class="rounded-lg border border-muted bg-elevated/40 p-4 transition-colors hover:bg-elevated/70"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-2">
            <UIcon
              name="i-lucide-triangle-alert"
              class="mt-0.5 size-4 shrink-0 text-warning"
            />
            <div class="min-w-0">
              <h3 class="truncate text-sm font-semibold text-highlighted">
                {{ group.modelDisplay || group.modelNormalized }} - {{ group.produk }}
              </h3>
            </div>
          </div>

          <UBadge
            color="neutral"
            variant="soft"
            label="Manual"
            size="sm"
          />
        </div>

        <div class="mt-4 flex flex-col gap-2">
          <UFormField
            label="Nama Produk benar"
            size="sm"
          >
            <UInput
              v-model="productInputs[getGroupKey(group)]"
              placeholder="Nama Produk yang benar"
              icon="i-lucide-tag"
              class="w-full"
              :disabled="approvingModels[getGroupKey(group)]"
              @keyup.enter="approveGroup(group)"
            />
          </UFormField>

          <UButton
            block
            icon="i-lucide-check"
            label="Approve Nama Produk"
            color="primary"
            :loading="approvingModels[getGroupKey(group)]"
            :disabled="approvingModels[getGroupKey(group)]"
            @click="approveGroup(group)"
          />
        </div>
      </div>
    </div>

    <template
      v-if="rows.length > 3"
      #footer
    >
      <UButton
        block
        color="neutral"
        variant="ghost"
        :trailing-icon="showAll ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        :label="showAll ? 'Tampilkan Lebih Sedikit' : 'Lihat Semua Antrean'"
        @click="showAll = !showAll"
      />
    </template>
  </UCard>
</template>
