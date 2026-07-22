<script setup lang="ts">
definePageMeta({
  layout: 'cs'
})

const glassCardClass = 'group flex cursor-pointer flex-col items-center justify-between rounded-3xl border border-white/60 bg-white/45 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-all duration-400 ease-out hover:-translate-y-2.5 hover:scale-[1.02] hover:border-white/80 hover:bg-white/65 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] md:p-8'
const iconContainerClass = 'mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-[#0F172A] shadow-sm transition-all duration-400 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[#0F172A] group-hover:text-white md:mb-8 md:h-14 md:w-14'
const actionButtonClass = 'flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-10 py-6 text-lg font-semibold text-white shadow-sm transition-all duration-300 ease-out group-hover:bg-[#1E293B] group-hover:shadow-[0_4px_12px_rgba(15,23,42,0.15)] md:w-auto'
</script>

<template>
  <!-- LAUNCHER CENTRAL PORTAL -->
  <section class="mx-auto my-auto flex w-full flex-col items-center justify-center py-10 md:py-0">
    <!-- Title & Greeting Section -->
    <div class="mb-8 max-w-2xl px-4 text-center md:mb-12">
      <NuxtLink
        to="/login"
        class="rounded-full border border-white/60 bg-white/40 px-4 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm backdrop-blur-sm"
      >
        Internal Portal QRCC - Cabang / CS
      </NuxtLink>
      <h2 class="my-3 text-3xl font-bold tracking-tight text-[#0F172A] md:mb-4 md:text-5xl leading-16">
        Selamat Datang di Portal Kartu Garansi
      </h2>
      <p class="text-sm text-[#64748B] md:text-base">
        Pusat pengelolaan dan pengajuan cetak ulang kartu garansi
      </p>
    </div>

    <!-- CARDS GRID -->
    <div class="flex flex-col max-w-4xl gap-6">
      <!-- CARD 1: BUAT PERMINTAAN BARU -->
      <NuxtLink to="/new">
        <span :class="actionButtonClass">
          <span class="text-3xl">Buat Permintaan Baru</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 transition-transform group-hover:translate-x-1"
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
    </div>
  </section>
</template>
