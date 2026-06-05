<script setup lang="ts">
import type { CardTypeKey, PrintLayout, WarrantyPrintQueueRow } from '~/types/print'

const PRINT_CLASS = 'is-warranty-card-printing'

const props = defineProps<{
  rows: WarrantyPrintQueueRow[]
  activeLayouts: Record<CardTypeKey, PrintLayout | null>
}>()

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

function getActivePrintLayout(type: CardTypeKey) {
  return props.activeLayouts[type] || createEmptyPrintLayout(type)
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

function stopPrinting() {
  document.body.classList.remove(PRINT_CLASS)
}

const printBase = usePrintWithFilename('KartuGaransi', () => {
  const first = props.rows[0]
  return first?.printBatchId || first?.key || 'batch'
})

async function print() {
  await nextTick()

  window.setTimeout(() => {
    document.body.classList.add(PRINT_CLASS)
    printBase()
  }, 100)
}

onMounted(() => {
  window.addEventListener('afterprint', stopPrinting)
})

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', stopPrinting)
  document.body.classList.remove(PRINT_CLASS)
})

defineExpose({ print })
</script>

<template>
  <div class="warranty-card-print-root">
    <section
      v-for="row in rows"
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
  </div>
</template>

<style scoped>
.warranty-card-print-root {
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

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  :global(body.is-warranty-card-printing) {
    background: #fff !important;
  }

  :global(body.is-warranty-card-printing *) {
    visibility: hidden !important;
  }

  :global(body.is-warranty-card-printing .warranty-card-print-root),
  :global(body.is-warranty-card-printing .warranty-card-print-root *) {
    visibility: visible !important;
  }

  :global(body.is-warranty-card-printing .warranty-card-print-root) {
    display: block !important;
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    background: #fff !important;
  }

  .warranty-print-page {
    page-break-after: always;
    break-after: page;
  }

  .warranty-print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
</style>
