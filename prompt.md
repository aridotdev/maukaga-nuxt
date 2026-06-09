# Plan: Pisah Project CS (Static) & Admin (Node) — Monorepo dengan Lock Admin

## Context

Project `maukaga-nuxt` adalah satu Nuxt 4 app yang menggabungkan halaman publik CS/Cabang (tanpa login) dan halaman Admin (butuh login Supabase). PRD §1.2 menjelaskan: target deployment bagian **Cabang/CS** adalah **statis** (file HTML yang dibuka di PC cabang, input data → API Google Apps Script). Bagian Admin butuh server Node.

Saat ini `.output/` adalah Nitro server (butuh Node runtime) — tidak bisa dibuka dari `file://` atau static host. Lock admin route belum kuat: `app/middleware/auth.global.ts` hanya redirect, tapi halaman, composables, dan server API admin tetap ter-bundle ke build manapun. Seseorang yang dapat `index.html` static CS juga mendapat bundle JS berisi seluruh logika admin.

**Outcome yang diharapkan:**
1. Apps `cs-web` build-nya **100% statis** (HTML + JS bundle), bisa di-zip dan dibuka dari `file://` di PC cabang
2. Apps `admin-web` build-nya **Node server** (Nitro), di-deploy ke VPS
3. Halaman `/login`, `/confirm`, `/403`, `/dashboard/**` **tidak ada sama sekali** di source `cs-web` → impossible bocor
4. Shared code (types, composables publik, css, utils) dipakai kedua app via workspace
5. Migration dilakukan bertahap, build lama tetap jalan sampai cut-over

---

## Arsitektur Target

```
maukaga-nuxt/                          # root monorepo
├── pnpm-workspace.yaml                # daftar 3 package
├── package.json                       # workspace root (scripts untuk build semua)
├── tsconfig.base.json                 # shared TS config
├── .env                               # API_URL, SUPABASE_URL, dll (shared)
├── .gitignore                         # diupdate
│
├── apps/
│   ├── cs-web/                        # STATIC (no Node needed)
│   │   ├── nuxt.config.ts
│   │   ├── package.json               # dep minimal: @nuxt/ui, @nuxtjs/supabase (client)
│   │   ├── app.vue
│   │   ├── pages/                     # HANYA: index, new, final-submit, check-status, print-ulang, 403
│   │   ├── layouts/cs.vue
│   │   ├── assets/css/main.css        # symlink atau copy
│   │   ├── public/                    # favicon, robots.txt
│   │   └── tsconfig.json
│   │
│   └── admin-web/                     # NODE server
│       ├── nuxt.config.ts
│       ├── package.json               # dep penuh: @nuxtjs/supabase, dll
│       ├── app.vue
│       ├── pages/                     # HANYA: login, confirm, 403, dashboard/** (index, pengajuan, cetak-kartu, cetak-label-pengiriman, settings/**)
│       ├── layouts/dashboard.vue
│       ├── middleware/                # auth.global.ts, auth-guard, role-guard, guest-guard
│       ├── composables/               # useUserProfile, useCurrentSession, useAuthBridge, useDashboard, useDashboardData, usePengajuanDetail, useReviewProductQueue, useAdminApi, useAppSheetQuery
│       ├── components/                # TeamsMenu, UserMenu, UnderConstruction, customers/, home/, inbox/, print/, settings/
│       ├── server/api/admin-action.post.ts
│       ├── assets/css/main.css        # symlink atau copy
│       ├── public/                    # favicon, robots.txt
│       └── tsconfig.json
│
├── packages/
│   └── shared/                        # @maukaga/shared
│       ├── package.json               # name: @maukaga/shared
│       ├── tsconfig.json
│       ├── runtime/
│       │   ├── composables/
│       │   │   ├── useAppsScriptApi.ts    # dipakai CS (tanpa token) & admin (pakai token)
│       │   │   └── usePrintWithFilename.ts
│       │   ├── utils/
│       │   │   ├── print.ts               # buildShippingLabels, chunkShippingLabels, dll
│       │   │   └── index.ts               # randomInt, randomFrom
│       │   ├── types/
│       │   │   ├── print.ts               # ApiResult, CardTypeKey, WarrantyPrintQueueRow, PrintLayout, ShippingLabel, AlertState
│       │   │   ├── database.types.ts
│       │   │   └── index.ts
│       │   └── css/
│       │       └── main.css               # @import tailwindcss & @nuxt/ui + theme
│       └── index.ts                       # barrel export
│
├── doc/prd.md                         # tidak berubah
├── README.md                          # diupdate: cara build & deploy per app
└── implementation-steps.md            # diupdate dengan sequence baru
```

---

## File-File Penting (Refactor Map)

### Halaman CS (tetap di `apps/cs-web/pages/`)
- `index.vue` (portal launcher) — layout `cs`
- `new.vue` (form pengajuan baru) — layout `cs`
- `final-submit.vue` (upload hard copy) — layout `cs`
- `check-status.vue` (cek status publik) — layout `cs`
- `print-ulang.vue` (print ulang) — layout `cs`
- `403.vue` (forbidden) — **duplikasi** di `apps/admin-web/pages/403.vue` (admin perlu juga)

### Halaman Admin (pindah ke `apps/admin-web/pages/`)
- `login.vue` → `apps/admin-web/pages/login.vue`
- `confirm.vue` → `apps/admin-web/pages/confirm.vue`
- `dashboard.vue` (wrapper) → `apps/admin-web/pages/dashboard.vue`
- `dashboard/index.vue` → `apps/admin-web/pages/dashboard/index.vue`
- `dashboard/pengajuan/index.vue` → `apps/admin-web/pages/dashboard/pengajuan/index.vue`
- `dashboard/pengajuan/[idPengajuan].vue` → `apps/admin-web/pages/dashboard/pengajuan/[idPengajuan].vue`
- `dashboard/cetak-kartu.vue` → `apps/admin-web/pages/dashboard/cetak-kartu.vue`
- `dashboard/cetak-label-pengiriman.vue` → `apps/admin-web/pages/dashboard/cetak-label-pengiriman.vue`
- `dashboard/settings/index.vue` (redirect) → `apps/admin-web/pages/dashboard/settings/index.vue`
- `dashboard/settings/layout-kartu.vue` → `apps/admin-web/pages/dashboard/settings/layout-kartu.vue`
- `dashboard/settings/members.vue` → `apps/admin-web/pages/dashboard/settings/members.vue`
- `dashboard/settings/security.vue` → `apps/admin-web/pages/dashboard/settings/security.vue`
- `dashboard/settings/product-name.vue` → `apps/admin-web/pages/dashboard/settings/product-name.vue`

### Composable — Dipindah ke shared
- `useAppsScriptApi.ts` → `packages/shared/runtime/composables/useAppsScriptApi.ts` (modifikasi: buat generic, token opsional via parameter; CS panggil tanpa token, admin panggil dengan token)
- `usePrintWithFilename.ts` → `packages/shared/runtime/composables/usePrintWithFilename.ts`

### Composable — Tetap di Admin Only
- `useAdminApi.ts` → `apps/admin-web/composables/`
- `useAuthBridge.ts` → `apps/admin-web/composables/`
- `useCurrentSession.ts` → `apps/admin-web/composables/`
- `useDashboard.ts` → `apps/admin-web/composables/`
- `useDashboardData.ts` → `apps/admin-web/composables/`
- `usePengajuanDetail.ts` → `apps/admin-web/composables/`
- `useReviewProductQueue.ts` → `apps/admin-web/composables/`
- `useUserProfile.ts` → `apps/admin-web/composables/`
- `useAppSheetQuery.ts` → `apps/admin-web/composables/`

### Middleware — Pindah ke Admin Only
- `auth.global.ts` → `apps/admin-web/middleware/`
- `auth-guard.ts` → `apps/admin-web/middleware/`
- `guest-guard.ts` → `apps/admin-web/middleware/`
- `role-guard.ts` → `apps/admin-web/middleware/`
- **CS tidak butuh middleware** karena tidak ada route admin sama sekali

### Layout
- `cs.vue` → `apps/cs-web/layouts/cs.vue`
- `dashboard.vue` → `apps/admin-web/layouts/dashboard.vue`

### Components
- `TeamsMenu.vue`, `UserMenu.vue`, `UnderConstruction.vue` → `apps/admin-web/components/`
- `components/customers/*` → `apps/admin-web/components/customers/`
- `components/home/*` → `apps/admin-web/components/home/`
- `components/inbox/*` → `apps/admin-web/components/inbox/`
- `components/print/*` → `apps/admin-web/components/print/`
- `components/settings/*` → `apps/admin-web/components/settings/`

### Server
- `server/api/admin-action.post.ts` → `apps/admin-web/server/api/admin-action.post.ts`
- CS **tidak butuh** folder `server/` sama sekali

### Types & Utils & CSS — ke Shared
- `types/print.ts` → `packages/shared/runtime/types/print.ts`
- `types/database.types.ts` → `packages/shared/runtime/types/database.types.ts`
- `types/index.d.ts` → **DIBUANG** (isinya boilerplate Nuxt UI template, tidak dipakai business logic)
- `utils/print.ts` → `packages/shared/runtime/utils/print.ts`
- `utils/index.ts` → `packages/shared/runtime/utils/index.ts`
- `assets/css/main.css` → `packages/shared/runtime/css/main.css`

### Static Assets
- `public/favicon.ico`, `public/robots.txt` → di-copy ke `apps/cs-web/public/` dan `apps/admin-web/public/`

### File yang tidak dipindah
- `doc/prd.md` — tetap di root
- `.env` — tetap di root (shared oleh kedua app, baca via `dotenv` di `nuxt.config.ts` masing-masing)
- `app/app.config.ts` (UI theme) — duplikasi ke `apps/cs-web/app.config.ts` dan `apps/admin-web/app.config.ts` (sama isinya)

---

## Konfigurasi Kunci

### `pnpm-workspace.yaml` (root)
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### `apps/cs-web/nuxt.config.ts`
- `ssr: true` (default), tapi pakai `nitro.prerender` untuk generate
- Modules: `@nuxt/ui`, `@nuxt/fonts`, `@nuxt/eslint`, `@nuxtjs/supabase` (client-side only)
- `routeRules`: `/`: `{ prerender: true }`, set sisanya manual
- `nitro.prerender.routes`: `['/']`
- `nitro.prerender.ignore`: `['/login', '/confirm', '/403', '/dashboard', '/dashboard/**', '/admin', '/admin/**']` — safety net
- `extends: ['../../packages/shared']` (Nuxt layer approach untuk CSS & composables auto-import)
- `runtimeConfig.public`: appsScriptApiUrl, supabaseUrl, supabaseKey, appName, maxUploadMb, maxItems (dari `.env`)
- `supabase.redirect: false`, tidak perlu server route guard
- `nitro.preset: 'static'` (output `.output/public/`)

### `apps/admin-web/nuxt.config.ts`
- `ssr: true` (default untuk dashboard)
- Modules lengkap sama dengan config sekarang
- `routeRules`: sama persis dengan `nuxt.config.ts` saat ini
- `extends: ['../../packages/shared']`
- `runtimeConfig`: sama + `SUPABASE_SERVICE_ROLE_KEY` private (untuk server `/api/admin-action`)
- `supabase.redirect: true`, redirectOptions seperti saat ini
- `nitro.preset: 'node-server'` (default, output `.output/server/`)

### `packages/shared/package.json`
```json
{
  "name": "@maukaga/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.ts",
    "./runtime/*": "./runtime/*"
  }
}
```

### `packages/shared/nuxt.config.ts` (Nuxt layer)
Mendeklarasikan runtime composables untuk auto-import di kedua app.

---

## Sequence Implementasi (Bertahap, Aman)

### Tahap 1 — Setup Monorepo (tidak ganggu build lama)
1. Update `pnpm-workspace.yaml` agar include `apps/*` dan `packages/*`
2. Tambah script di root `package.json`:
   - `"build:cs": "pnpm --filter @maukaga/cs-web build"`
   - `"build:admin": "pnpm --filter @maukaga/admin-web build"`
   - `"dev:cs": "pnpm --filter @maukaga/cs-web dev"`
   - `"dev:admin": "pnpm --filter @maukaga/admin-web dev"`
3. Bikin folder skeleton: `apps/cs-web/`, `apps/admin-web/`, `packages/shared/`
4. Buat `package.json` minimal di tiap app (dependency list)
5. `pnpm install` di root → workspace ter-link

### Tahap 2 — Isi Shared Package
1. Copy `types/print.ts`, `types/database.types.ts` → `packages/shared/runtime/types/`
2. Copy `utils/print.ts`, `utils/index.ts` → `packages/shared/runtime/utils/`
3. Copy `assets/css/main.css` → `packages/shared/runtime/css/`
4. Refactor `useAppsScriptApi.ts`:
   - Buat generic, terima `token?: string` sebagai parameter
   - Pindah ke `packages/shared/runtime/composables/useAppsScriptApi.ts`
5. Copy `usePrintWithFilename.ts` → `packages/shared/runtime/composables/`
6. Buat `packages/shared/nuxt.config.ts` (layer) untuk daftarkan composables + css
7. Buat `packages/shared/index.ts` barrel

### Tahap 3 — Isi apps/admin-web
1. Copy `nuxt.config.ts` saat ini → `apps/admin-web/nuxt.config.ts` (sesuaikan path extends)
2. Copy `app.vue` + `app.config.ts` (UI theme)
3. Copy `layouts/dashboard.vue`
4. Copy `middleware/*` (semua 4 file)
5. Copy `composables/*` (9 file admin-only)
6. Copy `components/*` (semua subdirektori admin)
7. Copy `pages/*` sesuai refactor map (login, confirm, dashboard/**, 403)
8. Copy `server/api/admin-action.post.ts`
9. Update semua `import '~/...'` dan `import '~types/...'` menjadi `import '@maukaga/shared/runtime/...'`
10. Test: `pnpm dev:admin` → dashboard login, halaman dashboard, semua fitur admin harus tetap jalan

### Tahap 4 — Isi apps/cs-web
1. Bikin `apps/cs-web/nuxt.config.ts` (static preset, no admin modules)
2. Copy `app.vue` + `app.config.ts`
3. Copy `layouts/cs.vue`
4. Copy `pages/*` sesuai refactor map (index, new, final-submit, check-status, print-ulang, 403)
5. Update `import '~/composables/useAppsScriptApi'` → `import { useAppsScriptApi } from '@maukaga/shared/runtime/composables/useAppsScriptApi'`
6. Update `import type { ... } from '~/types/print'` → `import type { ... } from '@maukaga/shared/runtime/types/print'`
7. Test: `pnpm generate:cs` → `.output/public/` harus berisi hanya halaman CS
8. **Verifikasi lock**: ekstrak `index.html` dari `.output/public/_nuxt/*.js` → grep untuk kata "admin", "dashboard", "supabase.auth.signInWithPassword" → harus kosong

### Tahap 5 — Hapus File Lama
1. Hapus `app/pages/login.vue`, `app/pages/confirm.vue`, `app/pages/dashboard.vue`, `app/pages/dashboard/**`
2. Hapus `app/middleware/*` (semua 4 file)
3. Hapus `app/composables/*` kecuali yang sudah dipindah ke shared
4. Hapus `app/components/*` (semua kecuali yang dipakai CS — verifikasi: components apa yang dipakai halaman CS? Cek semua .vue di `apps/cs-web/pages/` → jika tidak ada import ke components/, hapus semuanya)
5. Hapus `app/server/*`
6. Hapus `app/utils/*`, `app/types/*`, `app/assets/*` (sudah pindah ke shared)
7. Hapus `app/layouts/dashboard.vue`
8. Hapus `app/app.config.ts` (sudah diduplikasi)
9. Hapus folder `app/` jika kosong

### Tahap 6 — Verifikasi End-to-End
1. `pnpm dev:cs` → buka `http://localhost:3000` (atau port cs), test semua halaman CS publik
2. `pnpm dev:admin` → buka `http://localhost:3001` (port beda), login, test dashboard
3. `pnpm build:cs` → unzip `.output/public/` ke folder terpisah → double-click `index.html` → test dari `file://` di PC lokal
4. `pnpm build:admin` → `node .output/server/index.mjs` → test http://localhost:3000 → login
5. **Grep verification** (penting untuk security):
   ```bash
   # di apps/cs-web/.output/public/
   grep -r "admin_token" .          # harus kosong
   grep -r "signInWithPassword" .   # harus kosong
   grep -r "/dashboard" ./*.html    # harus kosong
   grep -r "useSupabaseClient" .    # boleh ada (CS butuh Supabase client untuk localStorage session opsional), tapi tidak boleh ada admin token
   ```

### Tahap 7 — Dokumentasi
1. Update `README.md`:
   - Quickstart per app
   - Cara build static: `pnpm build:cs` → zip → distribusi
   - Cara build admin: `pnpm build:admin` → PM2
2. Update `implementation-steps.md` dengan sequence baru (mark old steps sebagai completed)

---

## Pertimbangan Penting

### Kompatibilitas dengan `file://` (sesuai PRD §1.2)
- CS static HTML di-zip → klik `index.html` di PC cabang → browser buka `file:///.../index.html`
- API call ke Google Apps Script via `fetch` dari `file://` ke `https://` works di Chrome/Edge/Firefox (mixed origin diizinkan untuk GET/POST dengan `Content-Type: text/plain;charset=utf-8`)
- `localStorage` works di `file://` (terisolasi per-origin `file://`)
- Supabase client tidak dipakai di CS pages (cek halaman CS — tidak ada `useSupabaseClient` di index/new/final-submit/check-status/print-ulang). **Jika** ada use case CS butuh Supabase, baru tambahkan di CS config

### Build Output Size
- CS static: hanya ~5-6 halaman + JS bundle untuk form, print preview, dan check-status. Estimasi `.output/public/` < 1MB setelah gzip
- Admin server: lebih besar (~5-10MB karena full Nitro), tapi aman karena hanya di internal VPN/VPS

### Risk: Shared composable bocor logic admin
- `useAppsScriptApi` yang dipindah ke shared **tidak** membawa logic admin (tidak baca `admin_token` dari `sessionStorage`; token harus di-pass explicit sebagai parameter)
- `usePrintWithFilename` murni UI helper, tidak ada auth

### Risk: Bundle Nuxt UI bocor komponen admin
- `@nuxt/ui` v4 adalah package publik, dipakai CS untuk komponen form. Tidak ada komponen admin-specific
- Komponen admin (`HomeChart`, `CetakKartuStats`, dll) **dipindah** ke `apps/admin-web/components/`, jadi tidak akan ter-bundle di CS

### Verifikasi Lock (smoke test)
- Buka `apps/cs-web/.output/public/index.html` di browser, buka DevTools → Network → refresh
- Tidak boleh ada request ke `/api/admin-action`
- Tidak boleh ada JS chunk yang mengandung string "adminUsersList", "markWarrantyCardsPrinted", dll
- Tombol/link yang menuju `/dashboard`, `/login`, `/confirm` di CS pages akan broken link (expected) — tambahkan redirect ke `/` atau tampilkan "Halaman tidak tersedia" via catch-all route `pages/[...slug].vue` di CS

---

## Verifikasi (End-to-End Test)

### CS Static Test
1. `pnpm build:cs` → cek folder `apps/cs-web/.output/public/` ada
2. `cd apps/cs-web/.output/public && python -m http.server 8080` → buka `http://localhost:8080`
3. Test:
   - [ ] Halaman `/` tampil (portal launcher dengan 4 menu)
   - [ ] Klik "Buat Permintaan Baru" → `/new` tampil
   - [ ] Isi form minimal → klik Simpan Draft → tidak ada error network
   - [ ] Print preview muncul
   - [ ] Klik "Cek Status" → `/check-status` tampil
   - [ ] Masukkan ID dummy → error message dari API (expected)
4. Test dari `file://`:
   - Zip `.output/public/`
   - Extract ke folder berbeda
   - Double-click `index.html`
   - Test sama seperti di poin 3
5. Lock test:
   - [ ] Ketik `/dashboard` di URL → harus 404 atau redirect ke `/`
   - [ ] Ketik `/login` di URL → harus 404 atau redirect ke `/`
   - [ ] View source HTML → tidak ada reference ke `/dashboard` atau admin UI

### Admin Node Test
1. `pnpm build:admin` → cek folder `apps/admin-web/.output/server/` ada
2. `cd apps/admin-web/.output/server && node index.mjs` → server jalan di port 3000
3. Test:
   - [ ] Buka `http://localhost:3000` → redirect ke `/login`
   - [ ] Login dengan admin Supabase → masuk ke `/dashboard`
   - [ ] Buka `/dashboard/pengajuan` → list tampil
   - [ ] Buka detail → data tampil
   - [ ] Buka `/dashboard/cetak-kartu` → antrian tampil
   - [ ] Buka `/dashboard/settings/layout-kartu` → layout list tampil
   - [ ] Logout → kembali ke `/login`

### Workspace Integration Test
1. `pnpm install` di root → harus sukses tanpa error
2. `pnpm --filter @maukaga/shared typecheck` (jika ada) → shared types valid
3. `pnpm dev:cs` dan `pnpm dev:admin` jalan paralel di port berbeda → keduanya bisa di-refresh tanpa konflik

---

## File-File yang Berubah (Ringkasan)

**Dibuat baru (~25 file):**
- `pnpm-workspace.yaml` (update existing)
- Root `package.json` scripts (update)
- `packages/shared/{package.json, nuxt.config.ts, index.ts}` (3)
- `packages/shared/runtime/{composables,utils,types,css}/*` (~10 file)
- `apps/cs-web/{package.json, nuxt.config.ts, app.vue, app.config.ts, tsconfig.json}` (5)
- `apps/cs-web/{pages,layouts,public,assets}/*` (~10 file)
- `apps/admin-web/{package.json, nuxt.config.ts, app.vue, app.config.ts, tsconfig.json}` (5)
- `apps/admin-web/{pages,layouts,components,composables,middleware,server,public}/*` (40+ file)
- `apps/cs-web/pages/[...slug].vue` (catch-all 404, optional)

**Dihapus (~30 file):**
- `app/pages/login.vue`, `confirm.vue`, `dashboard.vue`, `dashboard/**`, `coba.vue`
- `app/middleware/*` (4)
- `app/composables/*` (11, kecuali yang shared)
- `app/components/*` (semua subdirektori + 3 root component)
- `app/server/*`
- `app/utils/*`, `app/types/*`, `app/assets/*`
- `app/layouts/dashboard.vue`
- `app/app.config.ts`, `app/app.vue` (akan diduplikasi ke 2 app)
- Folder `app/` jika kosong

**Diubah:**
- `nuxt.config.ts` (root) → dipecah jadi 2 file per app
- `package.json` (root) → tambah workspace scripts
- `tsconfig.json` (root) → bisa dihapus, atau jadi base config
- `README.md` → dokumentasi baru
- `implementation-steps.md` → tandai fase lama selesai
