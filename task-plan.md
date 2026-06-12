# Technical Plan: Lifecycle Status Kartu Garansi

## Tujuan

Memperluas `Pengajuan.Status` agar menjadi lifecycle utama yang mudah dibaca user dan admin, tanpa mencampur status approval item dengan status fulfillment kartu.

Status utama baru:

```txt
Baru -> Disetujui/Ditolak -> Diprint -> Dikirim -> Diterima -> Selesai
```

Status draft `Menunggu Upload` tetap menjadi status khusus dan tidak masuk `VALID_STATUSES`.

## Keputusan Produk

- `Pengajuan.Status` menjadi lifecycle ringkas/customer-facing.
- `PengajuanItems.Status Item` tetap approval-only:
  - `Baru`
  - `Disetujui`
  - `Ditolak`
  - `Selesai`
- `WarrantyCards` tetap menjadi sumber fakta teknis untuk cetak dan kirim:
  - `Status Cetak`
  - `Printed At`
  - `Printed By`
  - `Status Kirim`
  - `Shipped At`
  - `Shipped By`
- Status `Diprint` otomatis jika semua item yang disetujui sudah `Printed`.
- Status `Dikirim` otomatis jika semua item yang disetujui sudah `Dikirim`.
- Item `Ditolak` tidak menghambat lifecycle item yang `Disetujui`.
- `Diterima` dicatat di level pengajuan saja.
- `Diterima` dan `Selesai` diubah manual oleh Admin/QRCC.
- `Diterima` tidak otomatis menjadi `Selesai`.
- Status mundur hanya boleh oleh Admin dan wajib catatan.
- Migrasi data lama dihitung ulang dari `WarrantyCards`.

## Scope File Utama

- `doc/Code.gs`
- `apps/admin-web`
- `apps/cs-web`
- `doc/prd.md`
- `specs.md`

Catatan: implementasi utama status ada di Apps Script. Frontend perlu disesuaikan agar filter, badge, copy status, dan opsi update status mengenali status baru.

## Data Model

### Sheet `Pengajuan`

Kolom existing tetap dipakai:

- `Status`
- `Catatan Admin`
- `Tanggal Update Status Terakhir`
- `User Update Status`
- `Riwayat Singkat`

Tidak wajib menambah kolom baru untuk `Diterima` dan `Selesai` pada fase ini, karena metadata update terakhir sudah tersedia. Namun jika audit penerimaan perlu dibedakan dari update status umum, opsi tambahan yang bisa dipertimbangkan:

- `Received At`
- `Received By`
- `Completed At`
- `Completed By`

Rekomendasi fase pertama: jangan tambah kolom baru kecuali UI/reporting membutuhkan timestamp khusus.

### Sheet `PengajuanItems`

Tidak berubah secara konsep. `Status Item` tetap approval-only dan tidak diisi `Diprint`, `Dikirim`, atau `Diterima`.

### Sheet `WarrantyCards`

Tetap menjadi sumber fakta teknis:

- `Status Cetak = Printed` menandakan kartu sudah dicetak.
- `Status Kirim = Dikirim` menandakan kartu sudah dikirim.

Tidak perlu menambah `Status Diterima` per item, karena keputusan produk adalah `Diterima` level pengajuan.

### Sheet `ShippingLabels`

Tetap sebagai snapshot/queue label pengiriman. `Status Kirim` tetap disinkronkan dari aksi kirim.

## Backend Plan

### 1. Status Constants

Update status utama:

```js
const VALID_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'];
const ITEM_APPROVAL_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Selesai'];
const LIFECYCLE_ORDER = ['Baru', 'Disetujui', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'];
```

Catatan:

- `Ditolak` adalah terminal rejection path dan tidak dibandingkan sebagai progres maju normal.
- `DRAFT_STATUS = 'Menunggu Upload'` tetap terpisah.

### 2. Validasi Status Item

Update `handleUpdateItemStatus` agar validasi memakai `ITEM_APPROVAL_STATUSES`, bukan `VALID_STATUSES`.

Tujuan:

- Item tidak bisa diset menjadi `Diprint`, `Dikirim`, atau `Diterima`.
- Approval item tetap bersih dari fulfillment status.

### 3. Validasi Status Pengajuan

Update `handleUpdateStatus` agar:

- Menerima status utama baru.
- Menolak transisi mundur untuk QRCC.
- Mengizinkan transisi mundur hanya untuk Admin.
- Mewajibkan `Catatan Admin` jika:
  - status baru `Ditolak`
  - transisi mundur

Contoh transisi mundur:

- `Dikirim -> Diprint`
- `Diprint -> Disetujui`
- `Selesai -> Diterima`

### 4. Helper Transisi

Tambahkan helper:

- `getLifecycleRank_(status)`
- `isBackwardLifecycleTransition_(fromStatus, toStatus)`
- `assertStatusTransitionAllowed_(session, oldStatus, newStatus, catatanAdmin)`
- `appendStatusHistory_(...)` atau helper kecil agar update log konsisten

Tujuan:

- Aturan status tidak tersebar di banyak fungsi.
- Audit trail tetap konsisten di `StatusLog` dan `Riwayat Singkat`.

### 5. Helper Agregasi Fulfillment

Tambahkan helper untuk menghitung status pengajuan dari item approved dan `WarrantyCards`:

- `getApprovedItemKeysForPengajuan_(idPengajuan)`
- `getWarrantyFulfillmentState_(idPengajuan)`
- `derivePengajuanLifecycleFromFulfillment_(idPengajuan, currentStatus)`
- `syncPengajuanLifecycleFromWarranty_(idPengajuan, actor, note)`

Aturan agregasi:

- Jika pengajuan `Ditolak`, jangan auto-naik ke fulfillment.
- Jika pengajuan `Diterima` atau `Selesai`, jangan auto-turun karena aksi print/kirim.
- Ambil hanya item dengan `Status Item = Disetujui`.
- Jika tidak ada item disetujui, jangan ubah ke `Diprint` atau `Dikirim`.
- Jika semua item disetujui punya `Status Kirim = Dikirim`, status target `Dikirim`.
- Jika semua item disetujui punya `Status Cetak = Printed`, status target `Diprint`.
- Selain itu status tetap `Disetujui` atau status existing yang lebih rendah.

### 6. Update Saat Mark Printed

Di `handleMarkWarrantyCardsPrinted`:

1. Setelah `WarrantyCards` dan `ShippingLabels` berhasil disinkronkan, kumpulkan unique `ID Pengajuan`.
2. Untuk setiap ID, panggil `syncPengajuanLifecycleFromWarranty_`.
3. Jika semua approved item sudah printed, update `Pengajuan.Status` menjadi `Diprint`.
4. Tambahkan row `StatusLog` jika status berubah.

### 7. Update Saat Mark Shipped

Di `handleMarkShippingLabelsShipped`:

1. Setelah `WarrantyCards.Status Kirim` dan `ShippingLabels.Status Kirim` diset `Dikirim`, kumpulkan unique `ID Pengajuan`.
2. Untuk setiap ID, panggil `syncPengajuanLifecycleFromWarranty_`.
3. Jika semua approved item sudah dikirim, update `Pengajuan.Status` menjadi `Dikirim`.
4. Tambahkan row `StatusLog` jika status berubah.

### 8. Manual Diterima dan Selesai

Gunakan `handleUpdateStatus` untuk status manual:

- Admin/QRCC boleh set `Diterima`.
- Admin/QRCC boleh set `Selesai`.
- `Diterima` tidak otomatis menjadi `Selesai`.
- Transisi mundur dari `Diterima` atau `Selesai` hanya Admin dan catatan wajib.

Tambahan validasi yang disarankan:

- `Diterima` idealnya hanya boleh dari `Dikirim`, kecuali Admin dengan catatan.
- `Selesai` idealnya hanya boleh dari `Diterima`, kecuali Admin dengan catatan.

### 9. Dashboard Summary

Update `handleGetDashboard`:

- Tambahkan summary:
  - `diprint`
  - `dikirim`
  - `diterima`
- Pastikan filter status menerima status baru.
- Pastikan status lama tetap terbaca untuk data existing.

### 10. Public Check Status

Update `handleCheckPengajuanStatus`:

- Izinkan status baru.
- Response tetap ringkas.
- Jika search by serial, status item tetap approval-only, sedangkan `parentStatus` menampilkan lifecycle pengajuan.

## Frontend Plan

### 1. Dashboard Admin

Update admin frontend di `apps/admin-web`:

- Dropdown filter status menambah:
  - `Diprint`
  - `Dikirim`
  - `Diterima`
- Dropdown update status menambah:
  - `Diprint`
  - `Dikirim`
  - `Diterima`
- Badge status menambah warna untuk status baru.
- Summary cards menambah `Diprint`, `Dikirim`, `Diterima`.
- Validasi frontend:
  - `Ditolak` wajib catatan.
  - Jika user memilih status mundur, tampilkan catatan wajib jika role tersedia di frontend. Backend tetap menjadi guard utama.

Catatan: jika frontend belum menerima role user, cukup backend yang enforce transisi mundur.

### 2. Public Status UI

Update CS/public frontend di `apps/cs-web`, terutama halaman cek status:

Tambahkan badge dan copy:

- `Diprint`: Kartu garansi sudah dicetak dan sedang disiapkan untuk pengiriman.
- `Dikirim`: Kartu garansi sudah dikirim ke cabang/alamat terkait.
- `Diterima`: Kartu garansi sudah dikonfirmasi diterima.
- `Selesai`: Proses kartu garansi sudah selesai.

### 3. Warranty Print UI

Setelah `markWarrantyCardsPrinted` berhasil:

- Frontend tetap reload antrean seperti sekarang.
- Status pengajuan akan berubah otomatis di backend jika seluruh approved item sudah printed.
- Tidak perlu menampilkan status pengajuan di antrean cetak kecuali desain baru membutuhkan.

### 4. Shipping Label UI

Setelah `markShippingLabelsShipped` berhasil:

- Frontend tetap reload label/queue.
- Status pengajuan akan berubah otomatis di backend jika seluruh approved item sudah dikirim.

## Migrasi Data Lama

### Tujuan Migrasi

Menghitung ulang status pengajuan existing berdasarkan data `WarrantyCards`.

### Strategi

Buat fungsi Apps Script manual, misalnya:

```js
function migratePengajuanLifecycleFromWarrantyCards()
```

Aturan:

- Hanya proses pengajuan dengan status `Disetujui`, `Diprint`, atau `Dikirim`.
- Jangan ubah pengajuan `Baru`, `Ditolak`, `Diterima`, atau `Selesai`.
- Ambil approved item dari `PengajuanItems`.
- Jika semua approved item sudah `Status Kirim = Dikirim`, set `Dikirim`.
- Else jika semua approved item sudah `Status Cetak = Printed`, set `Diprint`.
- Else tetap `Disetujui`.
- Tambahkan `StatusLog` untuk perubahan otomatis migrasi.
- Isi `User` dengan `system:migration`.
- Isi catatan dengan `Migrasi lifecycle dari WarrantyCards`.

### Safety

- Buat dry-run function lebih dulu:

```js
function previewPengajuanLifecycleMigration()
```

Output preview:

- jumlah pengajuan yang tetap
- jumlah yang akan berubah ke `Diprint`
- jumlah yang akan berubah ke `Dikirim`
- daftar ID pengajuan yang berubah

## Dokumentasi

Update `doc/prd.md`:

- Bagian status pengajuan.
- Aturan bisnis status.
- Data model `Pengajuan.Status`.
- Alur cetak: mark printed dapat mengubah pengajuan ke `Diprint`.
- Alur kirim: mark shipped dapat mengubah pengajuan ke `Dikirim`.
- Alur manual `Diterima` dan `Selesai`.

Update `specs.md`:

- Prinsip status lifecycle baru.
- Pengaruh mark printed dan mark shipped ke status pengajuan.
- Copy/status badge yang perlu didesain.

## Test Plan

### Backend Manual Test

- Submit final menghasilkan `Baru`.
- Update pengajuan `Baru -> Disetujui` berhasil.
- Update item hanya menerima approval status.
- Item tidak bisa diset ke `Diprint`, `Dikirim`, atau `Diterima`.
- Mark printed sebagian item approved tidak mengubah pengajuan ke `Diprint`.
- Mark printed semua item approved mengubah pengajuan ke `Diprint`.
- Mark shipped sebagian item approved tidak mengubah pengajuan ke `Dikirim`.
- Mark shipped semua item approved mengubah pengajuan ke `Dikirim`.
- Pengajuan mixed approved/rejected tetap bisa naik jika semua approved item sudah processed.
- QRCC tidak bisa mundur status.
- Admin bisa mundur status jika catatan diisi.
- Admin tidak bisa mundur status tanpa catatan.
- `Ditolak` tetap wajib catatan.
- `Diterima` bisa diset manual oleh Admin/QRCC.
- `Selesai` bisa diset manual oleh Admin/QRCC.
- `Diterima` tidak otomatis menjadi `Selesai`.

### Frontend Manual Test

- Filter dashboard menampilkan status baru.
- Summary dashboard menghitung status baru.
- Detail pengajuan bisa update status baru.
- Badge status baru tampil di dashboard.
- Cek status publik menampilkan copy untuk `Diprint`, `Dikirim`, dan `Diterima`.
- Flow cetak kartu tetap memisahkan `Cetak Pilihan` dan `Tandai Sudah Dicetak`.
- Flow label/pengiriman tetap berjalan setelah status utama otomatis berubah.

### Migration Test

- Preview migration tidak mengubah data.
- Migration mengubah hanya data eligible.
- Migration tidak mengubah `Ditolak`, `Diterima`, `Selesai`, dan `Baru`.
- StatusLog mencatat perubahan migrasi.

## Rollout Plan

1. Implement constants dan helper status.
2. Update validasi backend status pengajuan dan status item.
3. Update sync otomatis setelah printed dan shipped.
4. Update dashboard dan public status UI.
5. Update dokumentasi.
6. Jalankan preview migration di Apps Script.
7. Review hasil preview bersama user.
8. Jalankan migration jika hasil preview aman.
9. Smoke test dashboard, cek status publik, cetak, kirim, diterima, dan selesai.

## Acceptance Criteria

- `Pengajuan.Status` mendukung `Diprint`, `Dikirim`, dan `Diterima`.
- `PengajuanItems.Status Item` tidak tercampur status fulfillment.
- Semua approved item printed membuat status pengajuan menjadi `Diprint`.
- Semua approved item shipped membuat status pengajuan menjadi `Dikirim`.
- `Diterima` dan `Selesai` hanya berubah lewat aksi manual Admin/QRCC.
- Transisi mundur hanya Admin dan wajib catatan.
- Dashboard, detail, filter, badge, summary, dan cek status publik mengenali status baru.
- Data lama bisa dimigrasikan dari `WarrantyCards` dengan preview aman.
