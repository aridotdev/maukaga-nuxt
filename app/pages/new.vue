<script setup>
const toasts = ref([])

const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10'

function showToast(message, type = 'success') {
  const id = Date.now()

  toasts.value.push({ id, message, type })

  window.setTimeout(() => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }, 3500)
}
</script>

<template>
  <section class="mx-auto flex min-h-full w-full max-w-5xl flex-col p-4 md:p-8">
    <!-- Workspace Header -->
    <div class="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center">
      <NuxtLink
        to="/"
        class="flex w-full items-center justify-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-900 md:w-auto"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Kembali ke Launcher</span>
      </NuxtLink>
      <span class="self-center rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-800 md:self-auto">
        Permintaan Baru
      </span>
    </div>

    <!-- TARGET CONTENT CONTAINER -->
    <div class="mb-8 grow rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div class="mx-auto max-w-2xl">
        <h2 class="mb-2 text-xl font-bold text-slate-900 md:text-2xl">
          Form Pengajuan Kartu Garansi
        </h2>
        <p class="mb-6 text-sm text-slate-500">
          Lengkapi data di bawah ini untuk membuat draft permintaan baru.
        </p>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Nama Konsumen <span class="text-red-500">*</span></label>
            <input type="text" :class="inputClass" placeholder="Masukkan nama lengkap konsumen">
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Bagian/Cabang <span class="text-red-500">*</span></label>
            <input type="text" :class="inputClass" placeholder="Contoh: Cabang Jakarta Pusat">
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Model Produk <span class="text-red-500">*</span></label>
              <input type="text" :class="inputClass" placeholder="Tipe / Model">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Nomor Seri <span class="text-red-500">*</span></label>
              <input type="text" :class="inputClass" placeholder="S/N Produk">
            </div>
          </div>
          <div class="flex justify-end pt-6">
            <button
              type="button"
              class="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 md:w-auto"
              @click="showToast('Draft berhasil dibuat! ID Pengajuan: KG-20260528-0001', 'success')"
            >
              Simpan Draft & Cetak Form
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TOAST NOTIFICATION CONTAINER -->
    <div class="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-10 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-xl"
          :class="toast.type === 'success'
            ? 'border-slate-800 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-800'"
        >
          <svg
            v-if="toast.type === 'success'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </section>
</template>
