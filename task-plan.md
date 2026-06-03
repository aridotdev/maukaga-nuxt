# Rencana Fitur: Perubahan Status dan Catatan Admin per Item

## Context

Saat ini perubahan status dan catatan admin masih berlaku di level `ID Pengajuan`: satu status dan satu catatan untuk seluruh item dalam satu pengajuan. Ini membuat kasus campuran sulit ditangani, misalnya 1 item ditolak tetapi item lain sebetulnya bisa lanjut diproses.

Target fitur ini adalah membuat status workflow dan catatan admin berlaku per item pengajuan, sehingga item yang ditolak tidak memblokir item lain. File UI utama yang dituju adalah `app/pages/dashboard/pengajuan/[idPengajuan].vue`, tetapi agar fitur benar-benar tersimpan dan stabil, perubahan minimal juga perlu dilakukan di backend Google Apps Script `doc/Code.gs` karena data saat ini belum punya field status/catatan per item.

## Rekomendasi Pendekatan

Implementasikan status item dengan tetap mempertahankan status parent `Pengajuan.Status` sebagai ringkasan kompatibilitas untuk dashboard dan fitur lama. Jangan tambah status baru seperti `Parsial` pada fase ini agar perubahan tetap kecil.

Rule ringkasan parent yang direkomendasikan:

1. Jika ada item berstatus `Baru`, parent tetap `Baru`.
2. Jika tidak ada `Baru` dan ada item `Disetujui`, parent menjadi `Disetujui`.
3. Jika semua item `Ditolak`, parent menjadi `Ditolak`.
4. Jika tidak ada `Baru` / `Disetujui` dan tidak semua `Ditolak`, parent menjadi `Selesai`.

Dengan rule ini, reminder admin tetap melihat pengajuan yang masih punya item `Baru`, tetapi item `Disetujui` tetap bisa lanjut karena antrean cetak akan dibuat berbasis status item.

## File Kritis

- `app/pages/dashboard/pengajuan/[idPengajuan].vue`
  - UI detail pengajuan dan form perubahan status.
- `doc/Code.gs`
  - API `getDetail`, `updateStatus`, data sheet, helper item, dan antrean cetak.

## Perubahan Backend di `doc/Code.gs`

### 1. Tambah kolom item workflow

Tambahkan kolom baru di belakang header `PengajuanItems`, tanpa menghapus kolom lama:

- `Status Item`
- `Catatan Admin Item`
- `Tanggal Update Status Item`
- `User Update Status Item`

Alasan: data lama tetap aman, dan item baru bisa punya status/catatan sendiri.

### 2. Inisialisasi item baru

Update `replaceItemRows_(id, items)` agar saat pengajuan dibuat/final submit, tiap item mendapat default:

- `Status Item = Baru`
- `Catatan Admin Item = ''`
- `Tanggal Update Status Item = ''`
- `User Update Status Item = ''`

Untuk data lama yang kolomnya masih kosong, saat dibaca gunakan fallback ke status parent pengajuan agar halaman tidak error.

### 3. Kirim field item status ke detail page

Update `getItemsForPengajuan_(id)` dan/atau `handleGetDetail(data)` agar setiap item mengirim field:

- `statusItem`
- `catatanAdminItem`
- `tanggalUpdateStatusItem`
- `userUpdateStatusItem`

Reuse helper yang sudah ada: `clean_()`, `readObjects_()`, `indexMap_()`, `formatDateTime_()`, dan `toIso_()`.

### 4. Tambah endpoint baru `updateItemStatus`

Tambahkan action baru di `doPost` bernama `updateItemStatus` agar flow lama `updateStatus` tidak dirusak.

Payload minimal:

- `idPengajuan`
- `noItem`
- `statusBaru`
- `catatanAdmin`

Validasi:

- `idPengajuan` wajib.
- `noItem` wajib.
- `statusBaru` harus salah satu dari `Baru`, `Disetujui`, `Ditolak`, `Selesai`.
- Jika `statusBaru === 'Ditolak'`, `catatanAdmin` wajib.
- Item harus ditemukan berdasarkan `ID Pengajuan + No Item`.

Proses:

1. Lock dengan `LockService.getScriptLock()` seperti `handleUpdateStatus`.
2. Update kolom item terkait.
3. Recalculate parent status menggunakan rule ringkasan di atas.
4. Update kolom parent `Pengajuan.Status`, `Catatan Admin`, `Tanggal Update Status Terakhir`, `User Update Status`, dan `Riwayat Singkat` sebagai ringkasan perubahan terakhir.
5. Append ke `StatusLog`.

### 5. Tambah `No Item` di `StatusLog`

Tambahkan kolom `No Item` di belakang header `StatusLog` agar riwayat perubahan bisa dibedakan per item.

Untuk log lama, field ini kosong. Untuk endpoint baru `updateItemStatus`, isi `No Item` sesuai item yang diubah.

### 6. Ubah antrean cetak menjadi berbasis item

Update `getApprovedWarrantyQueueItems_()` agar item masuk antrean cetak jika:

- `Status Item === 'Disetujui'`
- `produk_status === 'verified'`

Jangan lagi menjadikan parent `Pengajuan.Status === 'Disetujui'` sebagai syarat utama. Ini penting agar item yang disetujui tetap bisa diproses walaupun item lain dalam pengajuan yang sama ditolak atau masih baru.

## Perubahan Frontend di `app/pages/dashboard/pengajuan/[idPengajuan].vue`

### 1. Update type data

Tambahkan field ke `DetailItem`:

- `statusItem?: PengajuanStatus`
- `catatanAdminItem?: string`
- `tanggalUpdateStatusItem?: string`
- `userUpdateStatusItem?: string`

Tambahkan `noItem?: number | string` sebagai key utama untuk submit item.

Tambahkan `noItem?: number | string` ke `RiwayatStatus` supaya tabel riwayat bisa menampilkan item mana yang berubah.

### 2. Ganti fokus form status global menjadi status item

Panel kanan `Tindakan Admin` saat ini mengubah status parent. Untuk fitur baru:

- Jangan hapus status parent dari hero; tetap tampil sebagai ringkasan.
- Jangan pakai form global untuk mengubah seluruh pengajuan.
- Pindahkan aksi perubahan status ke level item.

Desain UI minimal yang disarankan:

- Pada daftar item, tampilkan badge `Status Item` untuk setiap item.
- Di setiap item, sediakan:
  - select `Ubah Status Ke`
  - textarea `Catatan Admin`
  - tombol `Simpan Item`
- Gunakan state form per item, misalnya berdasarkan key `String(noItem)`.

Ini lebih mudah dipahami admin dan menghindari ambiguitas catatan admin milik item mana.

### 3. Tambah state dan submit per item

Tambahkan state lokal per item:

- status baru per item
- catatan admin per item
- loading per item
- error/notice per item

Tambahkan fungsi baru:

- `initItemForms()` setelah `loadDetail()` sukses.
- `submitItemStatus(item)` untuk call API `updateItemStatus`.

Payload frontend:

- `idPengajuan: detail.idPengajuan`
- `noItem: item.noItem`
- `statusBaru`
- `catatanAdmin`

Setelah sukses:

- tampilkan toast sukses spesifik item.
- panggil `loadDetail()` ulang agar parent summary, item, dan riwayat tersinkron.

### 4. Validasi frontend

Pertahankan aturan lama, tapi berlaku per item:

- status harus valid.
- jika status tidak berubah, tampilkan notice.
- jika status `Ditolak`, catatan admin wajib.

Backend tetap harus melakukan validasi yang sama agar data stabil walaupun request manual dikirim.

### 5. Riwayat status

Tambahkan kolom `No Item` di tabel riwayat. Jika `No Item` kosong, tampilkan `-` agar log lama tetap aman.

## Hal yang Sengaja Tidak Dikerjakan

- Tidak menambah status baru `Parsial`.
- Tidak redesign dashboard besar-besaran.
- Tidak mengubah alur submit pengajuan selain default status item.
- Tidak menghapus endpoint lama `updateStatus`.
- Tidak mengubah status produk `produk_status`; itu tetap khusus verifikasi master produk.
- Tidak memindahkan logic backend dari Apps Script ke Nuxt.

## Urutan Implementasi

1. Update header `PengajuanItems` dan `StatusLog` di `doc/Code.gs`.
2. Update `replaceItemRows_()` untuk menulis default item status.
3. Update pembacaan item di `getItemsForPengajuan_()` / `handleGetDetail()`.
4. Tambah `updateItemStatus` di `doPost` dan handler backend-nya.
5. Tambah helper derive parent status dari semua item.
6. Update `getApprovedWarrantyQueueItems_()` agar queue cetak berbasis item `Disetujui` + produk `verified`.
7. Update type, state, dan UI di `app/pages/dashboard/pengajuan/[idPengajuan].vue`.
8. Update tabel riwayat agar menampilkan `No Item`.
9. Jalankan verifikasi manual end-to-end.

## Verifikasi Manual

### Skenario utama

1. Buat pengajuan dengan 2 item.
2. Buka halaman detail admin.
3. Ubah item 1 menjadi `Disetujui`.
4. Ubah item 2 menjadi `Ditolak` dengan catatan admin.
5. Pastikan item 1 tetap `Disetujui` dan item 2 `Ditolak`.
6. Reload halaman, pastikan status dan catatan per item tetap tersimpan.
7. Pastikan catatan admin item 2 tidak menimpa catatan item 1.

### Validasi

1. Coba ubah item ke `Ditolak` tanpa catatan.
2. Pastikan frontend menolak.
3. Jika memungkinkan, pastikan backend juga menolak request yang sama.

### Parent status

1. Jika masih ada item `Baru`, parent tetap `Baru`.
2. Jika ada item `Disetujui` dan tidak ada `Baru`, parent menjadi `Disetujui`.
3. Jika semua item `Ditolak`, parent menjadi `Ditolak`.
4. Jika item selesai semua atau campuran selesai/ditolak tanpa item baru/disetujui, parent menjadi `Selesai`.

### Antrean cetak

1. Pastikan item `Disetujui` + produk `verified` muncul di antrean cetak.
2. Pastikan item `Ditolak` tidak muncul.
3. Pastikan item ditolak tidak memblokir item lain dalam pengajuan yang sama.

### Backward compatibility

1. Buka pengajuan lama yang belum punya kolom item status.
2. Pastikan halaman tidak error.
3. Pastikan status item fallback dari parent status atau `Baru` sesuai data yang tersedia.
