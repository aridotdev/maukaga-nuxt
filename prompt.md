Anda berperan sebagai senior software engineer lakukan rekayasa balik arsitektur dan pahami alur data secara lengkap kode yang terkait dengan detail [idPengajuan].vue
Kemudian, identifikasi:
- Keputusan arsitektur yang buruk
- kode yang membuat lama ketika halaman ini dibuka
- Logika yang duplikat atau kode yang bermasalah
- Masalah atau risiko skalabilitas
- Masalah pemeliharaan
Terakhir, berikan:
- Penjelasan arsitektur yang singkat dan jelas
- Area masalah kritis yang membuat lama
- Strategi refactoring
- Kode tingkat produksi yang lebih baik
Jangan mengubah fungsionalitas lain yang tidak terkait dengan detail pengajuan [idPengajuan].vue, hanya tingkatkan kualitas kode, skalabilitas, dan pemeliharaan.


response :
Saya sudah lakukan reverse engineering dan refactor terbatas di jalur detail pengajuan, tanpa mengubah UI `[idPengajuan].vue`.

**Arsitektur**
Alur data sekarang:
`[idPengajuan].vue` -> `usePengajuanDetail()` -> `useAdminCacheQuery()` -> `/api/admin-cache/pengajuan/:id` -> SQLite admin cache -> background sync ke Apps Script bila perlu. Mutasi item/status masih langsung ke Apps Script dari client, lalu cache detail/list dipatch optimistik dan sync detail dipicu ulang.

**Masalah Kritis**
Penyebab utama halaman lama dibuka ada di endpoint detail: sebelumnya request akan menunggu `syncAdminCache(... mode: 'detail')` kalau ada item tanpa `produkStatus`. Karena data dari list cache sering belum punya `produkStatus`, first open bisa ikut menunggu Apps Script sampai timeout 30 detik.

Masalah arsitektur lain:
- Read path lewat Nuxt server cache, write path langsung dari client ke Apps Script. Ini bikin konsistensi cache sulit dijaga.
- Ada beberapa cache store yang dipatch manual, sehingga gampang stale.
- `useAdminCacheQuery` sebelumnya mengunci cache key pada path awal, kurang aman untuk route dinamis.
- Halaman detail terlalu gemuk: state form, validasi, formatting, Drive URL parsing, dialog confirm, dan UI berada di satu SFC.

**Perubahan Kode**
- [useAdminCacheApi.ts](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/app/composables/useAdminCacheApi.ts:85>) sekarang menerima path/params reaktif dan mengambil entry cache berdasarkan key request saat fetch.
- [usePengajuanDetail.ts](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/app/composables/usePengajuanDetail.ts:97>) sekarang memakai `detailPath` computed dan reload saat `idPengajuan` berubah.
- [usePengajuanDetail.ts](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/app/composables/usePengajuanDetail.ts:266>) sekarang patch detail cache ke `admin-cache-query-store`, bukan hanya store legacy.
- [[id].get.ts](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/server/api/admin-cache/pengajuan/[id].get.ts:16>) sekarang hanya blocking sync kalau detail tidak ada atau jumlah item > 0 tapi item cache kosong. Kalau detail cache ada, halaman bisa tampil cepat dan sync enrichment jalan background.

**Strategi Refactor Lanjutan**
Langkah berikut yang paling sehat: pindahkan helper status/decision/date/Drive URL dari SFC ke util domain pengajuan, ekstrak form review item/status ke composable kecil, lalu pindahkan mutasi Apps Script ke Nitro endpoint agar read/write satu boundary dan cache invalidation lebih terkendali.

Validasi: `pnpm lint` sempat berhasil. `pnpm typecheck` pertama menemukan satu error type guard, sudah saya perbaiki, tapi rerun typecheck ditolak oleh approval sehingga verifikasi TypeScript final belum bisa saya konfirmasi dari command. `app/pages/dashboard/pengajuan/index.vue` sudah modified di working tree, tetapi saya tidak menyentuh file itu.

