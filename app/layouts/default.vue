<template>
  <div
    class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[linear-gradient(135deg,#DDE4E8_0%,#F0F4F8_100%)] p-6 antialiased selection:bg-slate-200 md:p-8 font-[Inter,sans-serif]"
  >
    <!-- BACKGROUND ILLUSTRATION & GEOMETRIC SHAPES -->
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <!-- SVG Mesh Grid & Certificate Shield Illustration Line Art -->
      <svg
        class="absolute h-full w-full text-slate-300/40"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="layout-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              stroke-width="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#layout-grid)" />

        <!-- Abstract Guilloche/Security Lines -->
        <path
          d="M-100,200 Q 300,50 700,400 T 1500,200 T 2100,600"
          fill="none"
          stroke="rgba(15, 23, 42, 0.04)"
          stroke-width="3"
        />
        <path
          d="M-100,250 Q 300,100 700,450 T 1500,250 T 2100,650"
          fill="none"
          stroke="rgba(15, 23, 42, 0.03)"
          stroke-width="2"
        />
        <path
          d="M-100,300 Q 300,150 700,500 T 1500,300 T 2100,700"
          fill="none"
          stroke="rgba(15, 23, 42, 0.02)"
          stroke-width="1.5"
        />
      </svg>

      <!-- Floating Soft Glass Orbs -->
      <div
        class="pointer-events-none absolute left-[-5%] top-[-10%] z-0 h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12)_0%,rgba(255,255,255,0)_70%)] opacity-[0.65] md:h-[45vw] md:w-[45vw]"
      />
      <div
        class="pointer-events-none absolute bottom-[-15%] right-[-5%] z-0 h-[70vw] w-[70vw] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.06)_0%,rgba(255,255,255,0)_70%)] opacity-[0.65] md:h-[50vw] md:w-[50vw]"
      />

      <!-- Central Graphic Behind Page Content -->
      <div
        class="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-slate-900 opacity-[0.03] md:block"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-150 w-150"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
    </div>

    <!-- HEADER BRANDING -->
    <header class="relative z-10 mx-auto mt-2 flex w-full max-w-7xl flex-col items-center justify-between gap-4 md:flex-row md:gap-0">
      <div class="flex items-center gap-3">
        <!-- App Logo Box -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold leading-tight tracking-tight text-[#0F172A]">Mau KaGa</h1>
          <p class="text-[10px] font-medium uppercase tracking-wide text-[#64748B] md:text-xs">
            Sistem Pengajuan Kartu Garansi
          </p>
        </div>
      </div>

      <div class="rounded-full border border-white/60 bg-white/40 px-4 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm backdrop-blur-sm">
        Internal Portal QRCC - Cabang / CS
      </div>
    </header>

    <main class="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col py-10">
      <slot />
    </main>

    <!-- FOOTER -->
    <footer class="relative z-10 mx-auto w-full max-w-7xl pb-2 text-center text-xs font-medium text-[#64748B]">
      &copy; 2026 Mau KaGa QRCC System. All rights reserved.
    </footer>
  </div>
</template>
