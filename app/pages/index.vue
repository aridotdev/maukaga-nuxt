<script setup>
const currentAction = ref(null)
const showStatusResult = ref(false)
const toasts = ref([])

const actionLabels = {
  baru: 'Permintaan Baru',
  cek: 'Cek Status',
  draft: 'Lanjutkan Draft'
}

const glassCardClass = 'group flex cursor-pointer flex-col items-start justify-between rounded-3xl border border-white/60 bg-white/45 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-all duration-400 ease-out hover:-translate-y-2.5 hover:scale-[1.02] hover:border-white/80 hover:bg-white/65 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] md:p-8'
const iconContainerClass = 'mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-[#0F172A] shadow-sm transition-all duration-400 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[#0F172A] group-hover:text-white md:mb-8 md:h-14 md:w-14'
const actionButtonClass = 'flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-out group-hover:bg-[#1E293B] group-hover:shadow-[0_4px_12px_rgba(15,23,42,0.15)] md:w-auto'
const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10'

function navigateTo(actionType) {
  currentAction.value = actionType
  showStatusResult.value = false
}

function returnToLauncher() {
  currentAction.value = null
  showStatusResult.value = false
}

function showToast(message, type = 'success') {
  const id = Date.now()

  toasts.value.push({ id, message, type })

  window.setTimeout(() => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }, 3500)
}

function showStatus() {
  showStatusResult.value = true
  showToast('Mencari data pengajuan...', 'info')
}
</script>

<template>
  <div class="flex min-h-full flex-1 flex-col">
    <Transition
    enter-active-class="transition duration-500 ease-out"
    enter-from-class="scale-105 opacity-0"
    enter-to-class="scale-100 opacity-100"
    leave-active-class="transition duration-500 ease-out"
    leave-from-class="scale-100 opacity-100"
    leave-to-class="scale-95 opacity-0"
    mode="out-in"
  >
    <!-- LAUNCHER CENTRAL PORTAL -->
    <section
      v-if="!currentAction"
      key="launcher"
      class="mx-auto my-auto flex w-full max-w-6xl flex-col items-center justify-center py-10 md:py-0"
    >
      <!-- Title & Greeting Section -->
      <div class="mb-8 max-w-2xl px-4 text-center md:mb-12">
        <h2 class="mb-3 text-3xl font-bold tracking-tight text-[#0F172A] md:mb-4 md:text-5xl">
          Selamat Datang di Portal Garansi
        </h2>
        <p class="text-sm text-[#64748B] md:text-base">
          Pilih salah satu menu di bawah ini untuk memulai pemrosesan data, pengecekan berkas, atau pemantauan status kartu pelanggan dengan cepat.
        </p>
      </div>

      <!-- CARDS GRID -->
      <div class="grid w-full grid-cols-1 gap-6 px-2 md:grid-cols-3 md:gap-8 md:px-4">
        <!-- CARD 1: BUAT PERMINTAAN BARU -->
        <button type="button" :class="glassCardClass" @click="navigateTo('baru')">
          <span>
            <!-- Icon Context -->
            <span :class="iconContainerClass">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 md:h-7 md:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <span class="mb-2 block text-left text-lg font-bold tracking-tight text-[#0F172A] md:mb-3 md:text-xl">
              Buat Permintaan Baru
            </span>
            <span class="mb-6 block text-left text-xs leading-relaxed text-[#64748B] md:text-sm">
              Mulai pengisian formulir pengajuan kartu garansi baru untuk konsumen. Sistem akan menerbitkan ID Pengajuan & Resume Token secara otomatis.
            </span>
          </span>
          <span :class="actionButtonClass">
            <span>Form Baru</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>

        <!-- CARD 2: CEK STATUS PENGAJUAN -->
        <button type="button" :class="glassCardClass" @click="navigateTo('cek')">
          <span>
            <span :class="iconContainerClass">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 md:h-7 md:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <span class="mb-2 block text-left text-lg font-bold tracking-tight text-[#0F172A] md:mb-3 md:text-xl">
              Cek Status Pengajuan
            </span>
            <span class="mb-6 block text-left text-xs leading-relaxed text-[#64748B] md:text-sm">
              Pantau dan lacak posisi dokumen pengajuan secara langsung tanpa harus melakukan proses login. Cukup masukkan ID Pengajuan kartu Anda.
            </span>
          </span>
          <span :class="actionButtonClass">
            <span>Lacak Status</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>

        <!-- CARD 3: LANJUTKAN DRAFT -->
        <button type="button" :class="glassCardClass" @click="navigateTo('draft')">
          <span>
            <span :class="iconContainerClass">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 md:h-7 md:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </span>
            <span class="mb-2 block text-left text-lg font-bold tracking-tight text-[#0F172A] md:mb-3 md:text-xl">
              Lanjutkan Draft
            </span>
            <span class="mb-6 block text-left text-xs leading-relaxed text-[#64748B] md:text-sm">
              Lanjutkan pengisian draft tersimpan untuk mengunggah berkas fisik <i>hard copy</i> yang telah ditandatangani guna validasi final berkas.
            </span>
          </span>
          <span :class="actionButtonClass">
            <span>Upload Berkas</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>
      </div>
    </section>

    <!-- WORKSPACE FRAME / SIMULATION VIEW -->
    <section
      v-else
      key="workspace"
      class="mx-auto flex min-h-full w-full max-w-5xl flex-col p-4 md:p-8"
    >
      <!-- Workspace Header -->
      <div class="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center">
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-900 md:w-auto"
          @click="returnToLauncher"
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
        </button>
        <span class="self-center rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-800 md:self-auto">
          {{ actionLabels[currentAction] }}
        </span>
      </div>

      <!-- TARGET CONTENT CONTAINER -->
      <div class="mb-8 grow rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div v-if="currentAction === 'baru'" class="mx-auto max-w-2xl">
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

        <div v-else-if="currentAction === 'cek'" class="mx-auto max-w-md py-6 text-center">
          <h2 class="mb-2 text-xl font-bold text-slate-900 md:text-2xl">
            Lacak Status Pengajuan
          </h2>
          <p class="mb-6 text-sm text-slate-500">
            Masukkan ID Pengajuan Anda untuk melihat progres dokumen terbaru.
          </p>

          <div class="space-y-4">
            <div class="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                class="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-mono uppercase outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/10"
                placeholder="KG-YYYYMMDD-XXXX"
              >
              <button
                type="button"
                class="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 md:w-auto"
                @click="showStatus"
              >
                Cari
              </button>
            </div>

            <!-- Hasil Pencarian -->
            <Transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="translate-y-2 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
            >
              <div v-if="showStatusResult" class="mt-8 rounded-2xl border bg-slate-50 p-6 text-center">
                <span class="mb-4 block text-xs font-bold uppercase tracking-widest text-slate-400">Hasil Pencarian</span>
                <h3 class="mb-6 font-mono text-2xl font-black text-slate-800">
                  KG-20260528-0012
                </h3>

                <div class="mb-4 inline-flex items-center justify-center gap-3 rounded-full border border-amber-200 bg-amber-100 px-6 py-2 shadow-sm">
                  <span class="relative flex h-2.5 w-2.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                    <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600" />
                  </span>
                  <span class="text-sm font-bold tracking-wide text-amber-800">Menunggu Upload</span>
                </div>

                <p class="mt-2 text-sm font-medium text-slate-600">
                  Pengajuan masih berupa draft. Lanjutkan draft untuk upload hard copy bertanda tangan dan submit final.
                </p>
              </div>
            </Transition>
          </div>
        </div>

        <div v-else class="mx-auto max-w-xl">
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
    </section>
  </Transition>

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
  </div>
</template>
