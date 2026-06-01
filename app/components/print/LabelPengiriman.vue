<script setup lang="ts">
import type { ShippingLabel } from '~/types/print'

const PRINT_CLASS = 'is-shipping-label-printing'

defineProps<{
  labels: ShippingLabel[]
}>()

function stopPrinting() {
  document.body.classList.remove(PRINT_CLASS)
}

async function print() {
  await nextTick()

  window.setTimeout(() => {
    document.body.classList.add(PRINT_CLASS)
    window.print()
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
  <div class="shipping-label-print-root">
    <section
      v-for="(page, pageIndex) in chunkShippingLabels(labels)"
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
  </div>
</template>

<style scoped>
.shipping-label-print-root {
  display: none;
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

  :global(body.is-shipping-label-printing) {
    background: #fff !important;
  }

  :global(body.is-shipping-label-printing *) {
    visibility: hidden !important;
  }

  :global(body.is-shipping-label-printing .shipping-label-print-root),
  :global(body.is-shipping-label-printing .shipping-label-print-root *) {
    visibility: visible !important;
  }

  :global(body.is-shipping-label-printing .shipping-label-print-root) {
    display: block !important;
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 210mm !important;
    min-height: 297mm !important;
    background: #fff !important;
  }

  .shipping-label-print-page {
    page-break-after: always;
    break-after: page;
  }

  .shipping-label-print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
</style>
