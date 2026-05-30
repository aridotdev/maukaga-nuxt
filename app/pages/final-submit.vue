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

    <!-- TARGET CONTENT CONTAINER -->
    <div class="mb-8 grow rounded-3xl border bg-white/45 border-white/60 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl md:p-8">
      <div class="mx-auto max-w-xl">
        <h2 class="mb-2 text-xl font-bold text-slate-900 md:text-2xl">
          Upload Hard Copy Berkas
        </h2>
        <p class="mb-6 text-sm text-slate-500">
          Lanjutkan draft pengajuan untuk melampirkan file dokumen fisik (PDF/JPG).
        </p>

        <div class="space-y-6">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">ID Pengajuan</label>
              <input type="text" :class="[inputClass, 'font-mono uppercase']" placeholder="KG-YYYYMMDD-XXXX">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Resume Token</label>
              <input type="text" :class="[inputClass, 'font-mono']" placeholder="TKN-XXXX">
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Upload File Hard Copy Bertanda Tangan</label>
            <button
              type="button"
              class="w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:bg-slate-100"
              @click="showToast('Dialog pemilihan file (PDF/JPG) dibuka secara simulasi.', 'info')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mx-auto mb-3 h-12 w-12 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span class="block text-sm font-semibold text-slate-700">Klik untuk memilih file hasil pindai</span>
              <span class="mt-1 block text-xs text-slate-400">Pastikan formulir fisik telah ditandatangani. (Maks 10MB)</span>
            </button>
          </div>

          <div class="flex justify-end pt-2">
            <button
              type="button"
              class="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 md:w-auto"
              @click="showToast('Berkas berhasil disubmit final! Pengajuan masuk antrean review.', 'success')"
            >
              Submit Final Pengajuan
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
