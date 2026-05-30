<script setup>
const toasts = ref([])

function showToast(message, type = 'success') {
  const id = Date.now()

  toasts.value.push({ id, message, type })

  window.setTimeout(() => {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }, 3500)
}
</script>

<template>
  <div class="relative mx-auto flex w-full max-w-350 flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <!-- Header Section -->
    <header class="glass-panel flex flex-col items-start justify-between gap-3 rounded-2xl p-4 lg:flex-row lg:items-center lg:p-5">
      <div class="min-w-0 flex-1">
        <h1 class="mb-1 text-xl font-bold text-[#0a192f] lg:text-2xl">
          Form Pengajuan Kartu Garansi Baru
        </h1>
        <p class="max-w-none truncate text-xs leading-relaxed text-slate-500 lg:text-sm">
          Lengkapi data pengajuan, cetak hard copy, lalu unggah kembali dokumen bertanda tangan untuk finalisasi.
        </p>
      </div>
    </header>

    <!-- Main Content Layout (Left Form, Right Sidebar) -->
    <div class="flex flex-col gap-6 lg:flex-row">
      <!-- Left Column: Form Areas -->
      <div class="flex flex-1 flex-col gap-6">
        <!-- Section 1: Informasi Pemohon -->
        <section class="glass-panel relative rounded-4xl p-6 lg:p-8">
          <div class="mb-8 flex items-center justify-between border-b border-white/40 pb-4">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-white bg-white/60 text-[#0a192f] shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
                </svg>
              </div>
              <div>
                <p class="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Langkah 01
                </p>
                <h2 class="text-xl font-bold text-[#0a192f]">
                  Informasi Pemohon
                </h2>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Input Group -->
            <div class="flex flex-col gap-1.5">
              <label class="ml-1 text-sm font-semibold text-[#0a192f]">Nama Pemohon</label>
              <input type="text" placeholder="Masukkan nama Anda" class="glass-input w-full rounded-xl px-4 py-3 text-sm text-[#0a192f] placeholder:text-slate-400">
            </div>
            <!-- Input Group -->
            <div class="flex flex-col gap-1.5">
              <label class="ml-1 text-sm font-semibold text-[#0a192f]">Bagian/Cabang</label>
              <input type="text" placeholder="Contoh: Cabang Jakarta Pusat" class="glass-input w-full rounded-xl px-4 py-3 text-sm text-[#0a192f] placeholder:text-slate-400">
            </div>
            <!-- Input Group -->
            <div class="flex flex-col gap-1.5">
              <label class="ml-1 text-sm font-semibold text-[#0a192f]">Nama Pemilik Barang</label>
              <input type="text" placeholder="Masukkan nama pemilik barang" class="glass-input w-full rounded-xl px-4 py-3 text-sm text-[#0a192f] placeholder:text-slate-400">
            </div>
            <!-- Input Group -->
            <div class="flex flex-col gap-1.5">
              <label class="ml-1 text-sm font-semibold text-[#0a192f]">Tanggal Form</label>
              <div class="relative">
                <input type="date" value="2026-05-29" class="glass-input relative z-10 w-full appearance-none rounded-xl bg-transparent px-4 py-3 text-sm text-[#0a192f] [&::-webkit-calendar-picker-indicator]:opacity-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="pointer-events-none absolute right-4 top-1/2 z-0 h-5 w-5 -translate-y-1/2 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                </svg>
              </div>
            </div>
            <!-- Textarea Group -->
            <div class="flex h-full flex-col gap-1.5">
              <label class="ml-1 text-sm font-semibold text-[#0a192f]">Alasan Pengajuan</label>
              <textarea placeholder="Jelaskan alasan pengajuan kartu garansi baru" class="glass-input h-28 w-full resize-none rounded-xl px-4 py-3 text-sm text-[#0a192f] placeholder:text-slate-400" />
            </div>
            <!-- Textarea Group -->
            <div class="flex h-full flex-col gap-1.5">
              <label class="ml-1 text-sm font-semibold text-[#0a192f]">Catatan Tambahan (Opsional)</label>
              <textarea placeholder="Tambahkan catatan jika ada" class="glass-input h-28 w-full resize-none rounded-xl px-4 py-3 text-sm text-[#0a192f] placeholder:text-slate-400" />
            </div>
          </div>
        </section>

        <!-- Section 2: Daftar Produk -->
        <section class="glass-panel flex flex-col rounded-4xl p-6 lg:p-8">
          <div class="mb-6 flex items-center justify-between border-b border-white/40 pb-4">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-white bg-white/60 text-[#0a192f] shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25l-9-5.25-9 5.25m18 0l-9 5.25m9-5.25v7.5l-9 5.25m0-7.5L3 8.25m9 5.25v7.5M3 8.25v7.5l9 5.25" />
                </svg>
              </div>
              <div>
                <p class="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Langkah 02
                </p>
                <h2 class="text-xl font-bold text-[#0a192f]">
                  Daftar Produk
                </h2>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl border border-[#d9e2ec] bg-[#f0f4f8] px-4 py-2 text-sm font-semibold text-[#0a192f] transition-colors hover:bg-[#d9e2ec]"
              @click="showToast('Tambah item belum tersedia pada prototipe ini.', 'info')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
              </svg>
              Tambah Item
            </button>
          </div>

          <!-- Item List -->
          <div class="mb-8 flex flex-col gap-4">
            <!-- Product Item 1 -->
            <div class="glass-card group relative rounded-2xl border-l-4 border-l-[#334e68] p-5">
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <span class="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Item 1</span>
                  <h3 class="text-base font-bold text-[#0a192f]">
                    Detail Produk
                  </h3>
                </div>
                <button type="button" class="rounded-lg border border-transparent p-2 text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-.8 12.2A2 2 0 0115.2 21H8.8a2 2 0 01-2-1.8L6 7m4 4v6m4-6v6" />
                  </svg>
                </button>
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-500">Model</label>
                  <input type="text" placeholder="Model Produk" class="glass-input w-full rounded-lg px-3 py-2 text-sm text-[#0a192f]">
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-500">Nama Produk</label>
                  <input type="text" placeholder="Nama Produk Lengkap" class="glass-input w-full rounded-lg px-3 py-2 text-sm text-[#0a192f]">
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-500">Nomor Seri</label>
                  <input type="text" placeholder="Nomor Seri / S/N" class="glass-input w-full rounded-lg px-3 py-2 text-sm text-[#0a192f]">
                </div>
              </div>
            </div>

            <!-- Product Item 2 -->
            <div class="glass-card group relative rounded-2xl border-l-4 border-l-[#334e68] p-5">
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <span class="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Item 2</span>
                  <h3 class="text-base font-bold text-[#0a192f]">
                    Detail Produk
                  </h3>
                </div>
                <button type="button" class="rounded-lg border border-transparent p-2 text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-.8 12.2A2 2 0 0115.2 21H8.8a2 2 0 01-2-1.8L6 7m4 4v6m4-6v6" />
                  </svg>
                </button>
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-500">Model</label>
                  <input type="text" placeholder="Model Produk" class="glass-input w-full rounded-lg px-3 py-2 text-sm text-[#0a192f]">
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-500">Nama Produk</label>
                  <input type="text" placeholder="Nama Produk Lengkap" class="glass-input w-full rounded-lg px-3 py-2 text-sm text-[#0a192f]">
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-500">Nomor Seri</label>
                  <input type="text" placeholder="Nomor Seri / S/N" class="glass-input w-full rounded-lg px-3 py-2 text-sm text-[#0a192f]">
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Action in Form Area -->
          <div class="mt-auto flex flex-col items-center justify-between gap-4 border-t border-white/40 pt-6 sm:flex-row">
            <p class="text-xs italic text-slate-500">
              Draft akan tersimpan secara berkala.
            </p>
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a192f] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0a192f]/20 transition-colors hover:bg-[#102a43] sm:w-auto"
              @click="showToast('Draft berhasil dibuat! ID Pengajuan: KG-20260528-0001', 'success')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V3h12v6M6 18H5a2 2 0 01-2-2v-5a2 2 0 012-2h14a2 2 0 012 2v5a2 2 0 01-2 2h-1M6 14h12v7H6v-7z" />
              </svg>
              Simpan Draft & Cetak
            </button>
          </div>
        </section>
      </div>

      <!-- Right Column: Sidebar / Status Tracker -->
      <aside class="flex w-full flex-col gap-6 lg:w-80">
        <!-- Status Tracker Panel -->
        <div class="glass-panel rounded-4xl p-6">
          <div class="mb-6 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/60 text-[#0a192f] shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zM14 3v6h5M8 13h8M8 17h8" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alur Berkas
              </p>
              <h3 class="text-base font-bold text-[#0a192f]">
                Proses Pengajuan
              </h3>
            </div>
          </div>

          <div class="relative flex flex-col gap-3">
            <!-- Connecting Line -->
            <div class="absolute bottom-8 left-5.5 top-8 z-0 w-0.5 border-l border-white/40 bg-white" />

            <!-- Step 1: Active -->
            <div class="relative z-10 flex gap-4 rounded-2xl border border-[#102a43] bg-[#0a192f] p-4 text-white shadow-lg shadow-[#0a192f]/20">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-sm font-bold backdrop-blur-sm">
                01
              </div>
              <div>
                <h4 class="mb-1 text-sm font-bold text-white">
                  Lengkapi data
                </h4>
                <p class="text-xs leading-relaxed text-blue-100/80">
                  Isi data pemohon, alasan, dan daftar produk secara detail.
                </p>
              </div>
            </div>

            <!-- Step 2: Next (Inactive but styled) -->
            <div class="relative z-10 flex gap-4 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-sm font-bold text-[#0a192f] shadow-sm">
                02
              </div>
              <div>
                <h4 class="mb-1 text-sm font-bold text-[#0a192f]">
                  Cetak draft
                </h4>
                <p class="text-xs leading-relaxed text-slate-500">
                  Simpan draft, cetak form fisik, lalu minta tanda tangan basah.
                </p>
              </div>
            </div>

            <!-- Step 3: Pending -->
            <div class="relative z-10 flex gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/20 p-4 opacity-70 backdrop-blur-sm">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">
                03
              </div>
              <div>
                <h4 class="mb-1 text-sm font-bold text-slate-500">
                  Upload final
                </h4>
                <p class="text-xs leading-relaxed text-slate-400">
                  Unggah scan atau foto hard copy yang sudah lengkap &amp; ditandatangani.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Snippet -->
        <div class="glass-panel flex flex-col justify-center rounded-4xl p-6">
          <p class="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Referensi Draft
          </p>
          <p class="flex items-center gap-2 text-base font-bold text-[#0a192f]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-amber-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0zm10.5-5.25a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0v-6zm-.75 10.5a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            Belum diterbitkan
          </p>
        </div>
      </aside>
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
  </div>
</template>

<style scoped>
.glass-panel {
  background: rgb(255 255 255 / 45%);
  border: 1px solid rgb(255 255 255 / 60%);
  box-shadow: 0 8px 32px 0 rgb(10 25 47 / 5%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.glass-card {
  background: rgb(255 255 255 / 30%);
  border: 1px solid rgb(255 255 255 / 50%);
  box-shadow: 0 4px 24px -1px rgb(10 25 47 / 3%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.glass-card:hover {
  background: rgb(255 255 255 / 45%);
  box-shadow: 0 8px 24px -1px rgb(10 25 47 / 5%);
}

.glass-input {
  background: rgb(255 255 255 / 60%);
  border: 1px solid rgb(255 255 255 / 80%);
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}

.glass-input:focus {
  background: rgb(255 255 255 / 90%);
  border-color: #0a192f;
  outline: none;
  box-shadow: 0 0 0 3px rgb(10 25 47 / 10%);
}
</style>
