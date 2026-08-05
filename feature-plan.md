# IMPROVEMENT PLAN

## 1 Improve Dashboard Pengajuan Flow
tolong periksa kode di dashboard, singkat saja dan spesifik di flow pengajuan saja. apakah ada yang bisa di improve, karena saya merasa terlalu banyak dan lama loading data setiap kali ada update data. fokus ini saja dan jangan ubah kode yang sudah ada.

Bisa di-improve, dan bottleneck paling jelas ada di flow daftar pengajuan.

1. [app/pages/dashboard/pengajuan/index.vue:61](/home/arsya/sharp/maukaga-nuxt/app/pages/dashboard/pengajuan/index.vue:61) memakai `useDashboardData({ loadAll: true })`. Ini membuat halaman daftar selalu butuh semua data untuk search/filter frontend.

2. [app/composables/useDashboardData.ts:222](/home/arsya/sharp/maukaga-nuxt/app/composables/useDashboardData.ts:222) fetch halaman dashboard dilakukan berurutan `page 2, 3, 4...`, bukan paralel. Kalau total data besar, ini pasti terasa lama.

3. [app/pages/dashboard/pengajuan/index.vue:107](/home/arsya/sharp/maukaga-nuxt/app/pages/dashboard/pengajuan/index.vue:107) sampai [app/pages/dashboard/pengajuan/index.vue:150](/home/arsya/sharp/maukaga-nuxt/app/pages/dashboard/pengajuan/index.vue:150) semua row difilter, disort, lalu di-“explode” per item di frontend. Ini wajar kalau datanya kecil, tapi akan makin berat seiring data bertambah.

4. Setelah update item/status, [app/composables/usePengajuanDetail.ts:96](/home/arsya/sharp/maukaga-nuxt/app/composables/usePengajuanDetail.ts:96) dan [app/composables/usePengajuanDetail.ts:162](/home/arsya/sharp/maukaga-nuxt/app/composables/usePengajuanDetail.ts:162) invalidate seluruh `getDashboard`. Efeknya ketika daftar dibuka lagi, semua halaman bisa reload ulang, padahal yang berubah biasanya cuma satu pengajuan/item.

Saran paling berdampak: jangan jadikan `/dashboard/pengajuan` full-load sebagai default. Pindahkan search/filter/pagination ke Apps Script/API, atau minimal load page pertama dulu lalu load semua hanya saat user benar-benar butuh global search. Setelah update detail, patch cache row terkait saja, bukan invalidate semua dashboard.

## 2 Khusus Admin.

### 2.1 buatkan fitur “load all” di dashboard pengajuan. Jadi kalau admin butuh search/filter global, bisa klik tombol load all dulu baru search/filter di frontend. Ini akan mengurangi beban default load data untuk user biasa.

### 2.2 buatkan fitur edit dan delete pengajuan di admin dashboard. Jadi admin bisa langsung edit/delete pengajuan tanpa harus masuk ke detail pengajuan. Ini akan mengurangi beban load detail pengajuan untuk admin.

## 3 Dashboard homepage Chart

### 3.1 buatkan fitur filter chart di dashboard homepage berdasarkan priode tanggal, bulan, tahun. Jadi user bisa lihat chart berdasarkan priode yang diinginkan. chart default bisa tetap menampilkan data 1 bulan terakhir, tapi user bisa ubah priode chart sesuai kebutuhan.

### 3.2 isi chart jumlah pengajuan per satuan waktu (bulan atau minggu) dan status pengajuan (pending, approved, rejected). Jadi user bisa lihat trend pengajuan per satuan waktu dan statusnya. Ini akan membantu user untuk analisis data pengajuan.

