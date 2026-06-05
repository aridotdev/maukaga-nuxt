<script setup lang="ts">
definePageMeta({
  layout: 'cs'
})

const glassCardClass = 'group flex cursor-pointer flex-col items-start justify-between rounded-3xl border border-white/60 bg-white/45 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-all duration-400 ease-out hover:-translate-y-2.5 hover:scale-[1.02] hover:border-white/80 hover:bg-white/65 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] md:p-8'
const iconContainerClass = 'mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-[#0F172A] shadow-sm transition-all duration-400 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[#0F172A] group-hover:text-white md:mb-8 md:h-14 md:w-14'
const actionButtonClass = 'flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-out group-hover:bg-[#1E293B] group-hover:shadow-[0_4px_12px_rgba(15,23,42,0.15)] md:w-auto'
</script>

<template>
  <!-- LAUNCHER CENTRAL PORTAL -->
  <section class="mx-auto my-auto flex w-full flex-col items-center justify-center py-10 md:py-0">
    <!-- Title & Greeting Section -->
    <div class="mb-8 max-w-2xl px-4 text-center md:mb-12">
      <h2 class="mb-3 text-3xl font-bold tracking-tight text-[#0F172A] md:mb-4 md:text-5xl">
        Selamat Datang di Portal Garansi
      </h2>
      <p class="text-sm text-[#64748B] md:text-base">
        Pilih salah satu menu di bawah ini untuk memulai pemrosesan data, pengecekan berkas, atau pemantauan status kartu garansi dengan cepat.
      </p>
    </div>

    <!-- CARDS GRID -->
    <div class="grid w-full grid-cols-1 gap-6 px-2 md:grid-cols-2 md:gap-6 md:px-4 lg:grid-cols-4 lg:gap-8">
      <!-- CARD 1: BUAT PERMINTAAN BARU -->
      <NuxtLink to="/new" :class="glassCardClass">
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
            Mulai pengisian formulir pengajuan kartu garansi baru untuk konsumen. Sistem akan menerbitkan ID Pengajuan secara otomatis.
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
      </NuxtLink>

      <!-- CARD 2: CEK STATUS PENGAJUAN -->
      <NuxtLink to="/check-status" :class="glassCardClass">
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
      </NuxtLink>

      <!-- CARD 3: LANJUTKAN DRAFT -->
      <NuxtLink to="/final-submit" :class="glassCardClass">
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
      </NuxtLink>

      <!-- CARD 4: PRINT ULANG PENGAJUAN -->
      <NuxtLink to="/print-ulang" :class="glassCardClass">
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
                d="M9 14l-1.5 1.5L4 12m16 4l-1.5 1.5L20 16M6 8h12M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2m-12 0h12M6 8v8a2 2 0 002 2h8a2 2 0 002-2V8M10 12h4"
              />
            </svg>
          </span>
          <span class="mb-2 block text-left text-lg font-bold tracking-tight text-[#0F172A] md:mb-3 md:text-xl">
            Print Ulang Pengajuan
          </span>
          <span class="mb-6 block text-left text-xs leading-relaxed text-[#64748B] md:text-sm">
            Cetak ulang form pengajuan yang sudah pernah dibuat berdasarkan ID Pengajuan. Cocok untuk kebutuhan arsip atau dokumen fisik tambahan.
          </span>
        </span>
        <span :class="actionButtonClass">
          <span>Cetak Ulang</span>
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
      </NuxtLink>
    </div>
  </section>
</template>
