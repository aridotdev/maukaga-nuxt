import type { ShippingLabel, WarrantyPrintQueueRow } from '~/types/print'

export function buildShippingLabels(rows: WarrantyPrintQueueRow[]) {
  const groups = new Map<string, ShippingLabel>()

  rows.forEach((row) => {
    const cabang = String(row.bagianCabang || '').trim() || 'Tanpa Cabang'
    const key = cabang.toLowerCase()

    if (!groups.has(key)) groups.set(key, { cabang, qty: 0 })
    groups.get(key)!.qty += 1
  })

  return Array.from(groups.values()).sort((a, b) => a.cabang.localeCompare(b.cabang, 'id-ID'))
}

export function chunkShippingLabels(labels: ShippingLabel[]) {
  const pages: ShippingLabel[][] = []

  for (let index = 0; index < labels.length; index += 15) {
    pages.push(labels.slice(index, index + 15))
  }

  return pages
}

export function getAlertColor(type: 'success' | 'error' | 'info' | 'loading') {
  const colors = {
    success: 'success',
    error: 'error',
    info: 'info',
    loading: 'info'
  } as const

  return colors[type]
}

export function getAlertIcon(type: 'success' | 'error' | 'info' | 'loading') {
  const icons = {
    success: 'i-lucide-circle-check',
    error: 'i-lucide-circle-alert',
    info: 'i-lucide-info',
    loading: 'i-lucide-loader-circle'
  } as const

  return icons[type]
}
