# Improvement Plan

Tujuan utama plan ini adalah membuat dashboard lebih ringan saat data pengajuan berubah, lalu menambahkan fitur baru di atas data flow yang sudah stabil. Urutannya dibuat agar tidak overlap: optimasi query dan cache dikerjakan lebih dulu, baru fitur admin dan chart.

## Prinsip Prioritas

1. Kurangi full reload data pengajuan setelah update item/status.
2. Pisahkan kebutuhan data ringkas, list, detail, dan analytics.
3. Jadikan server/API sebagai sumber pagination, filter, search, sort, dan aggregate.
4. Pakai optimistic update atau patch cache untuk data yang baru saja diubah.
5. Tambahkan fitur baru hanya setelah kontrak data dasarnya stabil.

## Phase 1 - Stabilkan Data Flow Pengajuan - DONE

### 1.1 Pisahkan kontrak data dashboard

Saat ini `getDashboard` dipakai untuk beberapa kebutuhan sekaligus: summary homepage, latest pengajuan, full list pengajuan, dan basis filter/search.

Target:

- `getDashboardSummary`: hanya summary angka homepage.
- `getDashboardLatest`: hanya 5 pengajuan terbaru untuk homepage.
- `getPengajuanList`: list pengajuan dengan pagination/filter/search/sort.
- `getDetail`: tetap khusus detail satu pengajuan.

Manfaat:

- Homepage tidak ikut menanggung beban list besar.
- Daftar pengajuan tidak perlu `loadAll` sebagai default.
- Detail tidak perlu memicu reload besar setelah update kecil.

### 1.2 Ubah daftar pengajuan menjadi server-side list

File terkait:

- `app/pages/dashboard/pengajuan/index.vue`
- `app/composables/useDashboardData.ts`

Target:

- Default load hanya halaman pertama.
- Pagination dikirim ke API: `page`, `pageSize`.
- Search/filter/sort dikirim ke API.
- Response mengembalikan `rows`, `totalRows`, `page`, `pageSize`.

Catatan:

- Filter "Menunggu Review", "Disetujui", dan "Ditolak" sebaiknya menjadi parameter API.
- Frontend tetap boleh melakukan mapping tampilan, tetapi tidak perlu filter dan explode semua data besar sebagai default.

Acceptance:

- Masuk ke `/dashboard/pengajuan` hanya melakukan request data halaman aktif.
- Update filter/search tidak mengambil semua data.
- Pagination tetap akurat memakai `totalRows` dari server.

## Phase 2 - Kurangi Reload Setelah Update

### 2.1 Patch cache list setelah update item/status

File terkait:

- `app/composables/usePengajuanDetail.ts`
- `app/composables/useDashboardData.ts`

Masalah sekarang:

- `setItemDecision` dan `setPengajuanStatus` meng-invalidate `getDashboard`.
- Setelah user kembali ke daftar, data besar bisa dimuat ulang.

Target:

- Tambahkan helper patch cache untuk pengajuan tertentu berdasarkan `idPengajuan`.
- Setelah update item, patch `keputusanItem` pada item terkait di cache list jika row sudah ada.
- Setelah update status pengajuan, patch `status` row terkait.
- Invalidate full dashboard hanya untuk kondisi yang memang mengubah agregasi besar dan tidak bisa dipatch.

Acceptance:

- Update keputusan item terasa instant di detail.
- Kembali ke daftar tidak selalu memicu reload semua halaman.
- Summary homepage tetap bisa refresh, tetapi tidak memaksa full list refresh.

### 2.2 Refresh detail secara selektif

Masalah sekarang:

- Setelah update item/status, detail melakukan `query.refresh()` untuk sinkronisasi.

Target:

- Tetap boleh refresh detail setelah server sukses, tetapi jangan jadikan itu pemicu reload list global.
- Jika API bisa mengembalikan detail/row terbaru setelah mutasi, pakai response itu untuk patch cache dan kurangi request tambahan.

Acceptance:

- Satu aksi update tidak menghasilkan rantai request yang tidak perlu.
- Error rollback tetap aman.

## Phase 3 - Load All Sebagai Fitur Opsional Admin

### 3.1 Tambahkan tombol Load All di daftar pengajuan

Dependency:

- Dikerjakan setelah Phase 1 agar default flow sudah ringan.

Target:

- Tombol hanya untuk admin.
- Tombol dipakai saat admin benar-benar butuh search/filter global di frontend.
- Tampilkan progress: `loadedRows` dari `totalRows`.
- Cache hasil load all dengan TTL agar tidak ulang dari nol saat navigasi balik sebentar.

Catatan:

- Ini bukan pengganti server-side pagination.
- Ini fallback untuk kebutuhan operasional tertentu.

Acceptance:

- User biasa tidak mendapat beban load all.
- Admin bisa memilih kapan mengambil seluruh data.
- Default `/dashboard/pengajuan` tetap cepat.

## Phase 4 - Fitur Admin Edit/Delete Pengajuan

### 4.1 Tambahkan edit pengajuan dari dashboard admin

Dependency:

- Dikerjakan setelah Phase 1 dan Phase 2.
- Butuh kontrak mutasi yang jelas agar cache list/detail bisa dipatch.

Target:

- Admin bisa edit field pengajuan yang memang boleh diubah dari list.
- Perubahan memakai modal/drawer ringkas.
- Setelah save, patch cache row terkait.

Catatan:

- Jangan memindahkan semua kemampuan detail ke list.
- List cukup untuk edit cepat field administratif; review item detail tetap di halaman detail.

Acceptance:

- Edit satu pengajuan tidak reload seluruh list.
- Detail pengajuan tetap konsisten saat dibuka setelah edit.

### 4.2 Tambahkan delete pengajuan dari dashboard admin

Dependency:

- Dikerjakan setelah edit dan patch cache list stabil.

Target:

- Admin bisa delete dengan confirm dialog.
- Setelah delete sukses, hapus row terkait dari cache list.
- Update summary secara terpisah atau invalidate summary saja.

Catatan risiko:

- Pastikan delete menangani item, riwayat, attachment, dan data terkait sesuai aturan backend.
- Jika delete sebenarnya soft delete, nama fiturnya di UI sebaiknya mengikuti perilaku tersebut.

Acceptance:

- Delete tidak meninggalkan row stale di list.
- Tidak ada full reload list kecuali rollback/error recovery.

## Phase 5 - Dashboard Homepage Chart

### 5.1 Buat endpoint aggregate chart

Dependency:

- Dikerjakan setelah kontrak dashboard summary/list dipisah.

Target:

- Chart mengambil data aggregate, bukan full list pengajuan.
- Parameter minimal: `startDate`, `endDate`, `groupBy`, dan `status`.
- `groupBy` bisa `day`, `week`, `month`, atau `year`.

Acceptance:

- Chart tidak bergantung pada `loadAll`.
- Mengubah periode chart hanya refresh data chart.

### 5.2 Tambahkan filter periode chart

Target:

- Default: 1 bulan terakhir.
- Opsi periode: tanggal custom, bulan, tahun.
- Query chart debounce atau hanya jalan saat user apply filter.

Acceptance:

- User bisa melihat tren pengajuan tanpa memperberat daftar pengajuan.
- Loading chart tidak mengganggu loading tabel/list.

### 5.3 Tampilkan tren jumlah pengajuan per status

Target:

- Series: pending/baru, approved/disetujui, rejected/ditolak.
- Label status mengikuti istilah app: `Baru`, `Disetujui`, `Ditolak`.
- Pastikan definisi "pending" konsisten, apakah berarti status pengajuan `Baru` atau item `Belum Diputuskan`.

Acceptance:

- Chart jelas membedakan status pengajuan dan keputusan item.
- Tidak ada ambiguitas antara pending pengajuan dan pending review item.

## Urutan Implementasi Ringkas

1. Pecah kontrak data: summary, latest, list, detail.
2. Jadikan `/dashboard/pengajuan` server-side paginated/search/filter.
3. Patch cache setelah update item/status, kurangi invalidate global.
4. Tambahkan `Load All` opsional khusus admin.
5. Tambahkan edit pengajuan admin dengan patch cache.
6. Tambahkan delete pengajuan admin dengan patch cache dan confirm.
7. Buat endpoint aggregate chart.
8. Tambahkan filter periode chart.
9. Tampilkan series chart per status.

## Yang Ditunda

- Full refactor seluruh dashboard.
- Rewrite UI besar-besaran.
- Menggabungkan fitur edit/delete dengan detail review item.
- Load all otomatis untuk semua role.
- Chart yang mengambil data dari full list frontend.
