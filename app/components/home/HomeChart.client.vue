<script setup lang="ts">
import { format } from 'date-fns'
import { useElementSize } from '@vueuse/core'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: Date
  amount: number
}

const { width } = useElementSize(cardRef)
const chartParams = computed(() => ({
  period: props.period,
  range: props.range
}))
const {
  points,
  summary,
  isLoading,
  isRefreshing,
  error,
  refresh
} = useDashboardChartData(chartParams)

const data = computed<DataRecord[]>(() => {
  return points.value.map(point => ({
    date: parsePeriodDate(point.period),
    amount: Number(point.totalItems || 0)
  }))
})

watch(chartParams, () => {
  void refresh()
}, { immediate: true })

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.amount

const total = computed(() => summary.value.totalItems)
const isBusy = computed(() => isLoading.value || isRefreshing.value)

const formatNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

function parsePeriodDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? new Date(value) : date
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${formatNumber(d.amount)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: 'px-0! pt-0! pb-3!' }">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs text-muted uppercase mb-1.5">
            Total Item Diajukan
          </p>
          <p class="text-3xl text-highlighted font-semibold">
            {{ formatNumber(total) }}
          </p>
        </div>
        <UIcon
          v-if="isBusy"
          name="i-lucide-loader-circle"
          class="mt-1 size-4 animate-spin text-muted"
        />
      </div>
    </template>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="error"
      class="mx-4 mb-3"
    />

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
