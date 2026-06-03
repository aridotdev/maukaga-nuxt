# Task Plan Migrasi Mau KaGa ke Nuxt

Dokumen ini adalah rencana kerja komprehensif untuk memigrasikan sistem Mau KaGa dari frontend HTML statis (`doc/index.html`, `doc/dashboard.html`) ke Nuxt, Nuxt UI, dan TypeScript, tetap memakai backend Google Apps Script di `doc/Code.gs` sebagai API utama. Target akhir: aplikasi Nuxt berjalan dengan fitur yang sama seperti versi lama, memakai visual style `doc/design.md`, dan halaman launcher cabang mengikuti arah `doc/new_ui_maukaga_launcher.html`.

## 0. Prinsip Migrasi

- Pertahankan kontrak backend Google Apps Script terlebih dahulu. Fase awal tidak mengubah `Code.gs` kecuali ditemukan bug/blocker integrasi.
- Semua request ke Apps Script memakai `POST`, body JSON string, dan header `Content-Type: text/plain;charset=utf-8`.
- Semua response API mengikuti bentuk `{ success: true, data }` atau `{ success: false, error }`.
- Token admin tetap disimpan di `sessionStorage`; jangan pindahkan ke `localStorage`.
- Resume token draft boleh disimpan di `localStorage` seperti sistem lama, tetapi diperlakukan sebagai data sensitif.
- Print view A4 untuk form cabang, kartu garansi, dan label cabang harus diuji manual di browser karena sensitif terhadap ukuran mm, margin, dan page break.
- Desain baru memakai Nuxt UI + Tailwind, bukan Tailwind CDN.
- Visual utama mengikuti soft glassmorphism: background abu/teal lembut, surface putih transparan, blur, border putih tipis, shadow lembut, teks navy gelap, dan spacing lega.

## 1. Fase Setup Proyek

### 1.1 Inisialisasi Nuxt

- [x] Buat proyek Nuxt di root repo saat ini.
- [x] Aktifkan TypeScript strict mode.
- [x] Install dan konfigurasi modul utama:
  - `@nuxt/ui`
  - `@pinia/nuxt` atau gunakan composable state bawaan Nuxt jika state tetap sederhana
  - `@vueuse/nuxt`
  - `zod` untuk validasi payload frontend
  - `date-fns` atau util lokal untuk format tanggal Indonesia
- [x] Siapkan script package:
  - `dev`
  - `build`
  - `preview`
  - `typecheck`
  - `lint`
  - `test`
- [x] Buat struktur folder dasar:
  - `app/pages`
  - `app/components`
  - `app/composables`
  - `app/types`
  - `app/utils`
  - `app/assets/css`
  - `app/middleware`
  - `tests`

### 1.2 Runtime Config

- [x] Pindahkan nilai dari `doc/config.js` ke runtime config Nuxt.
- [x] Buat `.env.example`:

```env
NUXT_PUBLIC_APP_NAME=Mau KaGa
NUXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbxAikXauXo-Ct_FfawqXjrdMxa3K-cK6eyBZFuG74IlrVNW2bE2vwX4BLsEo-CS7AwIyA/exec
NUXT_PUBLIC_MAX_UPLOAD_MB=10
NUXT_PUBLIC_MAX_ITEMS=10
```

- [x] Di `nuxt.config.ts`, expose:
  - `public.appName`
  - `public.gasApiUrl`
  - `public.maxUploadMb`
  - `public.maxItems`
- [x] Tambahkan validasi startup/client guard jika `gasApiUrl` kosong.

### 1.3 Styling Foundation

- [x] Buat `app/assets/css/main.css`.
- [x] Definisikan token CSS:
  - background gradient `#DDE4E8` ke `#F0F4F8`
  - primary text `#0F172A`
  - secondary text `#64748B`
  - glass surface `rgba(255, 255, 255, 0.45-0.70)`
  - glass border `rgba(255, 255, 255, 0.60)`
  - glass shadow `0 8px 32px rgba(0, 0, 0, 0.05)`
- [x] Buat utility class lokal:
  - `.glass-panel`
  - `.glass-card`
  - `.app-shell`
  - `.field-error`
  - `.print-only`
  - `.no-print`
- [x] Pastikan CSS print tidak tercampur dengan layout app normal.

## 2. Fase Kontrak API dan TypeScript

### 2.1 Tipe Domain

- [x] Buat `app/types/api.ts` untuk generic response:
  - `ApiSuccess<T>`
  - `ApiFailure`
  - `ApiResponse<T>`
- [x] Buat `app/types/pengajuan.ts`:
  - `PengajuanStatus = 'Menunggu Upload' | 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'`
  - `FinalPengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'`
  - `PengajuanItem`
  - `PengajuanPayload`
  - `DraftReference`
  - `StatusCheckResult`
  - `DashboardRow`
  - `PengajuanDetail`
  - `StatusLogEntry`
- [x] Buat `app/types/model-produk.ts`:
  - `ModelProdukRow`
  - `ProductReviewGroup`
  - `ProductReviewItem`
- [x] Buat `app/types/print.ts`:
  - `WarrantyCardType = 'Local' | 'Import'`
  - `WarrantyCardTypeKey = 'local' | 'import'`
  - `WarrantyPrintQueueRow`
  - `PrintLayout`
  - `PrintLayoutState`
  - `ShippingLabel`

### 2.2 API Client

- [x] Buat `app/composables/useGasApi.ts`.
- [x] Implementasi wrapper:
  - ambil `gasApiUrl` dari runtime config
  - kirim `fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) })`
  - parse JSON
  - jika `success === false`, throw `GasApiError`
  - dukung token opsional untuk action admin
- [x] Tambahkan action helper typed:
  - public: `saveDraftPengajuan`, `getDraftPengajuan`, `checkDraftPengajuanStatus`, `checkPengajuanStatus`, `getModelProduk`, `submitDraftPengajuan`
  - admin: `adminLogin`, `adminLogout`, `getDashboard`, `getDetail`, `updateStatus`, `getProductReviewQueue`, `approveModelProduk`, `getWarrantyPrintQueue`, `getPrintLayouts`, `savePrintLayout`, `deletePrintLayout`, `setActivePrintLayout`, `saveWarrantyCardTypes`, `markWarrantyCardsPrinted`
- [x] Tambahkan fallback plan jika CORS bermasalah di domain Nuxt:
  - buat server route internal `/api/gas`
  - server route meneruskan request ke Apps Script
  - frontend tetap memanggil composable yang sama
  - aktifkan fallback via env flag, bukan mengganti kontrak fitur

### 2.3 Validasi Frontend

- [x] Buat `app/utils/validation.ts`.
- [x] Validasi form publik:
  - `nama`, `bagianCabang`, `pemilik`, `tanggalForm`, `alasanPengajuan` wajib
  - tanggal form valid dan tidak lebih dari 7 hari ke depan
  - minimal 1 item
  - setiap item wajib punya `model`, `produk`, `nomorSeri`
  - jumlah item maksimal `maxItems`
  - file wajib hanya saat submit final
  - file hanya PDF/JPG/JPEG/PNG
  - ukuran file maksimal `maxUploadMb`
- [x] Validasi admin:
  - login wajib username dan password
  - update status `Ditolak` wajib catatan admin
  - approve model wajib nama produk
  - cetak/tandai printed wajib minimal 1 item dan semua item punya jenis kartu
  - layout wajib nama, type valid, angka valid, gap boleh negatif

## 3. Fase Layout, Navigasi, dan Shell

### 3.1 App Shell Publik

- [x] Buat halaman `/` sebagai launcher cabang.
- [x] Launcher menampilkan 3 aksi seperti `doc/new_ui_maukaga_launcher.html`:
  - Buat Permintaan Baru
  - Cek Status Pengajuan
  - Lanjutkan Draft
- [x] Pakai glass card, ikon, tombol pill, animasi hover halus, dan background sesuai `design.md`.
- [x] Aksi launcher bisa diarahkan ke route:
  - `/pengajuan`
  - `/status`
  - `/draft`
- [x] Support query lama pada root maupun `/draft`:
  - `id`
  - `idPengajuan`
  - `token`
  - `resumeToken`

### 3.2 Admin Shell

- [x] Buat layout admin dengan sidebar/sidebar-lite yang menyatu dengan background.
- [x] Menu admin:
  - Dashboard
  - Review Produk
  - Cetak Kartu
  - Layout Cetak
  - Label Cabang
  - Logout
- [x] Buat middleware `admin-auth.client.ts`:
  - cek token dari `sessionStorage`
  - redirect ke `/admin/login` jika token tidak ada
  - jangan akses `sessionStorage` saat server render
- [x] Pada unauthorized API error, bersihkan session dan redirect ke login.

## 4. Fase Form Publik Cabang/CS

### 4.1 State dan Composable

- [ ] Buat `app/composables/usePublicPengajuan.ts`.
- [ ] State:
  - data pengajuan
  - daftar item
  - model-produk map
  - current draft id
  - current resume token
  - mode `draft` atau `final`
  - file upload
  - loading/error/success
- [ ] Load `getModelProduk` saat halaman form dibuka.
- [ ] Normalisasi model di frontend dengan trim, collapse spasi, uppercase agar cocok dengan backend.
- [ ] Jika model ditemukan, otomatis isi `produk` dan kunci input produk.
- [ ] Jika model tidak ditemukan, produk tetap editable.

### 4.2 Halaman `/pengajuan`

- [ ] Buat form data pengajuan:
  - Nama
  - Bagian/Cabang
  - Pemilik
  - Tanggal Form default hari ini
  - Alasan Pengajuan Kartu Garansi Baru
  - Catatan Tambahan
- [ ] Buat daftar item dengan urutan input:
  - Model
  - Produk / Nama Produk
  - Nomor Seri
- [ ] Tambah/hapus item sampai limit `maxItems`.
- [ ] Tombol utama:
  - `Simpan Draft & Cetak`
  - `Submit Final` hanya muncul pada mode final
- [ ] Saat `Simpan Draft & Cetak`:
  - validasi tanpa file
  - call `saveDraftPengajuan`
  - simpan `{ idPengajuan, resumeToken, resumeUrl, savedAt }` ke `localStorage`
  - render print form
  - panggil `window.print()`
- [ ] Saat submit final:
  - validasi termasuk file
  - convert file ke base64 tanpa prefix data URL
  - call `submitDraftPengajuan`
  - hapus draft reference di `localStorage`
  - tampilkan success state dengan ID pengajuan

### 4.3 Halaman `/draft`

- [ ] Tampilkan pilihan:
  - input ID pengajuan
  - tombol muat draft
  - tombol draft terakhir dari browser
- [ ] Jika ID tanpa token, call `checkDraftPengajuanStatus`.
- [ ] Jika token tersedia, call `getDraftPengajuan`.
- [ ] Isi ulang form publik dan masuk mode final.
- [ ] Jika route mengandung query `id/token`, muat otomatis dan bersihkan query dari URL setelah berhasil.
- [ ] Pastikan error jelas untuk token salah, draft tidak ditemukan, atau status bukan `Menunggu Upload`.

### 4.4 Halaman `/status`

- [ ] Form input ID pengajuan.
- [ ] Call `checkPengajuanStatus`.
- [ ] Render badge status:
  - `Menunggu Upload`
  - `Baru`
  - `Disetujui`
  - `Ditolak`
  - `Selesai`
- [ ] Tampilkan hanya data publik aman: ID, status, ringkasan teks, tanggal update bila tersedia.
- [ ] Jangan tampilkan data pribadi lengkap pada cek status publik.

## 5. Fase Print Form Pengajuan

- [ ] Buat `app/components/public/PengajuanPrintView.vue`.
- [ ] Print view ukuran A4.
- [ ] CSS print:
  - `@page { size: A4; margin: 14mm; }`
  - sembunyikan seluruh app kecuali print container
  - background putih
- [ ] Printout wajib memuat:
  - ID Pengajuan
  - Nama
  - Bagian/Cabang
  - Pemilik
  - Alasan Pengajuan
  - Catatan Tambahan
  - Produk/Model/Nomor Seri atau tabel item jika item lebih dari satu
- [ ] Blok tanda tangan awal:
  - teks `Tanggal Form : {tanggal form}`
  - tabel 3 kolom `Diajukan`, `Diketahui`, `Disetujui`
  - footer `CS Head`, `Branch Manager`
- [ ] Blok tanda tangan akhir:
  - teks `Disetujui dan diberikan :` tetap kosong untuk alur cetak cabang
  - tabel 2 kolom `Diberikan`, `Disetujui`
  - footer `Controller`, `QRCC Div. Head`
- [ ] Jika halaman bukan `file:` dan draft punya token, tampilkan link lanjutkan draft di area no-print.
- [ ] Uji manual print preview Chrome/Edge.

## 6. Fase Admin Login dan Session

- [ ] Buat `app/composables/useAdminSession.ts`.
- [ ] State:
  - token
  - username
  - nama admin
  - loggedIn
- [ ] Simpan token di `sessionStorage`.
- [ ] Buat halaman `/admin/login`:
  - username
  - password/PIN
  - call `adminLogin`
  - simpan session
  - redirect `/admin`
- [ ] Implement logout:
  - call `adminLogout`
  - hapus session browser
  - redirect `/admin/login`
- [ ] Jangan render dashboard sebelum token tersedia di client.

## 7. Fase Dashboard Admin

### 7.1 Composable Dashboard

- [ ] Buat `app/composables/useDashboard.ts`.
- [ ] State:
  - summary
  - rows
  - totalRows
  - page
  - pageSize default 20
  - filters: `search`, `status`, `dateFrom`, `dateTo`
  - loading/error
- [ ] Call `getDashboard` dengan token.
- [ ] Debounce search 300ms.
- [ ] Validasi pageSize maksimal 100.

### 7.2 Halaman `/admin`

- [ ] Render summary cards:
  - Total Pengajuan
  - Baru
  - Disetujui
  - Ditolak
  - Selesai
- [ ] Render filter:
  - search ID/nama/cabang
  - status
  - tanggal submit dari/sampai
- [ ] Render tabel:
  - No
  - ID Pengajuan
  - Waktu Submit
  - Nama
  - Bagian/Cabang
  - Jml Item
  - Status
  - Aksi Detail
- [ ] Pagination server-side.
- [ ] Pastikan draft `Menunggu Upload` tidak muncul karena backend sudah memfilter status final.

## 8. Fase Detail dan Update Status

- [ ] Buat `app/composables/usePengajuanDetail.ts`.
- [ ] Buat route `/admin/pengajuan/[id]` atau modal detail dari dashboard. Pilihan utama: route agar URL bisa dibagikan internal.
- [ ] Call `getDetail`.
- [ ] Tampilkan informasi:
  - ID Pengajuan
  - Waktu Submit
  - Nama
  - Bagian/Cabang
  - Pemilik
  - Tanggal Form
  - Alasan Pengajuan
  - Catatan Tambahan
  - Jumlah Item
  - link file hard copy `target="_blank" rel="noopener"`
  - Status
  - Catatan Admin
  - Tanggal update status terakhir
  - User update status
- [ ] Tampilkan item:
  - No Item
  - Produk
  - Model
  - Nomor Seri
  - status verifikasi produk
- [ ] Tampilkan riwayat status dari `StatusLog`.
- [ ] Form update status:
  - status baru: `Baru`, `Disetujui`, `Ditolak`, `Selesai`
  - catatan admin
  - validasi catatan wajib untuk `Ditolak`
  - call `updateStatus`
  - refresh detail dan dashboard setelah berhasil

## 9. Fase Review Nama Produk

- [ ] Buat `app/composables/useModelProdukReview.ts`.
- [ ] Buat route `/admin/review-produk` atau section di `/admin`. Pilihan utama: tampil sebagai section ringkas di dashboard dan route khusus untuk daftar penuh.
- [ ] Call `getProductReviewQueue`.
- [ ] Tampilkan grouping:
  - model normalized
  - model display
  - jumlah item pending
  - pilihan/usulan produk dari input manual
  - contoh pengajuan/item
- [ ] Form approve nama produk:
  - input nama produk final
  - call `approveModelProduk`
  - tampilkan jumlah item yang diperbarui
  - refresh queue
- [ ] Setelah approve, item dengan model tersebut harus masuk antrean cetak jika pengajuannya `Disetujui`.

## 10. Fase Antrean Cetak Kartu Garansi

### 10.1 Composable Print Queue

- [ ] Buat `app/composables/useWarrantyPrintQueue.ts`.
- [ ] State:
  - rows
  - summary
  - search
  - filter jenis kartu
  - includePrinted
  - selected row keys
  - loading/error
- [ ] Call `getWarrantyPrintQueue`.
- [ ] Row key mengikuti backend: `{idPengajuan}::{noItem}`.

### 10.2 Halaman `/admin/cetak`

- [ ] Render summary:
  - total
  - local
  - import
  - belum jenis kartu
  - printed
- [ ] Render filter:
  - search
  - jenis kartu Local/Import
  - toggle include printed
- [ ] Render tabel:
  - checkbox selection
  - ID Pengajuan
  - No Item
  - Nama
  - Bagian/Cabang
  - Produk
  - Model
  - Nomor Seri
  - Jenis Kartu
  - Status Cetak
  - Batch
  - Reprint Count
- [ ] Aksi:
  - pilih jenis kartu per item
  - batch set jenis kartu
  - simpan jenis kartu via `saveWarrantyCardTypes`
  - preview/cetak kartu
  - tandai printed via `markWarrantyCardsPrinted`
  - buka preview label dari batch hasil printed
- [ ] Validasi sebelum cetak:
  - minimal 1 item selected
  - semua selected punya jenis kartu
- [ ] Cetak kartu tidak otomatis mengubah status cetak.

## 11. Fase Layout Cetak Kartu

- [ ] Buat `app/composables/usePrintLayouts.ts`.
- [ ] Buat route `/admin/setting/layout-cetak`.
- [ ] Call `getPrintLayouts`.
- [ ] Tampilkan layout aktif per type:
  - local
  - import
- [ ] Form edit layout:
  - type
  - name
  - offsetX
  - offsetY
  - gapProductModel
  - gapModelSerial
- [ ] Aksi:
  - tambah layout
  - duplikasi layout aktif
  - simpan via `savePrintLayout`
  - jadikan aktif via `setActivePrintLayout`
  - hapus via `deletePrintLayout`
- [ ] Disable/hide hapus untuk layout builtin dan layout aktif.
- [ ] Tampilkan preview posisi field kartu berdasarkan layout aktif.

## 12. Fase Print Kartu Garansi

- [ ] Buat `app/components/admin/WarrantyCardPrintView.vue`.
- [ ] Gunakan ukuran A4 per item.
- [ ] Terapkan CSS lama:
  - `.warranty-print-page`
  - type `local` dan `import`
  - variabel `--warranty-adjust-x`
  - variabel `--warranty-adjust-y`
  - variabel `--warranty-gap-product-model`
  - variabel `--warranty-gap-model-serial`
- [ ] Render field absolut:
  - produk
  - model
  - nomor seri
- [ ] Sort item selected:
  - Local dulu
  - Import
  - kosong terakhir
  - ID pengajuan
  - no item
- [ ] Uji print preview untuk layout Local dan Import.

## 13. Fase Label Pengiriman Cabang

- [ ] Buat `app/composables/useShippingLabels.ts`.
- [ ] Buat route `/admin/cetak/label`.
- [ ] Data label dari `getWarrantyPrintQueue` dengan `includePrinted: true`.
- [ ] Jika dari batch, filter `printBatchId`.
- [ ] Group item printed per `bagianCabang`.
- [ ] Qty label = jumlah item printed untuk cabang.
- [ ] Buat `app/components/admin/ShippingLabelPrintView.vue`.
- [ ] Format A4:
  - 15 label per halaman
  - 3 kolom
  - ukuran label 60mm x 50mm
- [ ] Aksi:
  - preview label
  - print label
- [ ] Jangan buat label dari item yang belum `Printed`.

## 14. Fase UI Component System

- [ ] Buat komponen reusable:
  - `AppGlassPanel`
  - `AppPageHeader`
  - `AppStatusBadge`
  - `AppAlert`
  - `AppEmptyState`
  - `AppLoadingState`
  - `AppConfirmDialog`
  - `AppFileDropzone`
  - `AppPagination`
  - `AppDataTable`
- [ ] Pakai Nuxt UI untuk:
  - button
  - input
  - select
  - textarea
  - modal/slideover
  - toast
  - badge
  - table jika cocok
- [ ] Pastikan semua tombol aksi punya loading dan disabled state.
- [ ] Gunakan ikon melalui Nuxt UI/Iconify atau library ikon yang terpasang.
- [ ] Hindari teks instruksi berlebihan di UI; gunakan label, placeholder, state, dan feedback yang langsung relevan.

## 15. Fase Keamanan Frontend

- [ ] Escape semua data yang dirender di print HTML jika menggunakan `v-html`. Lebih aman: render dengan binding Vue biasa.
- [ ] Link file Drive memakai `target="_blank"` dan `rel="noopener"`.
- [ ] Jangan log token admin atau resume token.
- [ ] Jangan menyimpan token admin di cookie/localStorage.
- [ ] Bersihkan query `token/resumeToken` setelah draft berhasil dimuat.
- [ ] Saat logout, clear state admin dan selection cetak.
- [ ] Jangan tampilkan resume token di UI kecuali link lanjutkan draft yang memang diperlukan untuk user.

## 16. Fase Testing

### 16.1 Unit Test

- [ ] Test util normalisasi model.
- [ ] Test validasi form publik.
- [ ] Test validasi file.
- [ ] Test grouping shipping labels.
- [ ] Test sorting print queue selected rows.
- [ ] Test mapping status badge.

### 16.2 Component Test

- [ ] Form pengajuan:
  - tambah/hapus item
  - auto-fill produk dari model master
  - produk locked saat model verified
  - produk editable saat model baru
- [ ] Status check:
  - success status
  - ID kosong
  - error not found
- [ ] Admin dashboard:
  - render summary
  - render empty table
  - pagination
- [ ] Print layout form:
  - validasi angka
  - disable delete layout builtin/aktif

### 16.3 E2E Manual atau Playwright

- [ ] Public flow lengkap:
  - buka `/`
  - pilih Buat Permintaan Baru
  - isi form
  - simpan draft
  - print preview muncul
  - lanjutkan draft
  - upload file
  - submit final
  - cek status `Baru`
- [ ] Admin flow:
  - login admin
  - dashboard load
  - filter/search
  - buka detail
  - update status ke `Disetujui`
  - approve model baru jika ada
  - item muncul di antrean cetak
  - pilih jenis kartu
  - preview/cetak kartu
  - mark printed
  - preview/cetak label cabang
- [ ] Session:
  - refresh dashboard tetap login selama token valid
  - logout membersihkan session
  - unauthorized redirect ke login
- [ ] Print:
  - form cabang A4
  - kartu Local A4
  - kartu Import A4
  - label cabang A4 15 label per halaman

## 17. Fase Integrasi Backend Google Apps Script

- [ ] Pastikan `Code.gs` sudah dipasang di project Apps Script.
- [ ] Jalankan `setupApp()`.
- [ ] Pastikan sheet dibuat:
  - `Pengajuan`
  - `PengajuanItems`
  - `Users`
  - `EmailRecipients`
  - `Config`
  - `StatusLog`
  - `EmailLog`
  - `WarrantyCards`
  - `PrintBatch`
  - `PrintLayouts`
  - `ModelProduk`
- [ ] Pastikan Drive folder upload dibuat dan `DRIVE_FOLDER_ID` tersimpan di sheet `Config`.
- [ ] Deploy Apps Script sebagai Web App.
- [ ] Salin URL `/exec` ke `NUXT_PUBLIC_GAS_API_URL`.
- [ ] Uji health check:
  - buka `{GAS_URL}?action=ping`
  - pastikan response JSON success.
- [ ] Uji dari Nuxt dev server:
  - `getModelProduk`
  - `saveDraftPengajuan`
  - `checkPengajuanStatus`
  - `adminLogin`
  - `getDashboard`
- [ ] Jika Apps Script deployment berubah, update env dan restart Nuxt dev server.
- [ ] Ganti password default `admin/admin123` di sheet `Users`.

## 18. Fase Deployment Nuxt

- [ ] Tentukan target hosting:
  - Vercel
  - Netlify
  - Cloudflare Pages
  - static hosting internal
- [ ] Set environment variables production:
  - `NUXT_PUBLIC_APP_NAME`
  - `NUXT_PUBLIC_GAS_API_URL`
  - `NUXT_PUBLIC_MAX_UPLOAD_MB`
  - `NUXT_PUBLIC_MAX_ITEMS`
- [ ] Build production:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- [ ] Smoke test production:
  - launcher terbuka
  - form publik load model-produk
  - admin login
  - dashboard load
  - print preview tidak rusak
- [ ] Dokumentasikan URL production dan URL Apps Script yang dipakai.

## 19. Urutan Implementasi yang Disarankan

1. Setup Nuxt, Nuxt UI, TypeScript, runtime config, styling base.
2. Buat API client typed dan domain types.
3. Bangun launcher `/` sesuai contoh UI baru.
4. Bangun form publik `/pengajuan`, draft resume `/draft`, status check `/status`.
5. Implement print form A4 cabang.
6. Implement admin login, session, middleware.
7. Implement admin dashboard dan detail/update status.
8. Implement review nama produk.
9. Implement antrean cetak, jenis kartu, dan print kartu.
10. Implement layout cetak.
11. Implement label cabang.
12. Jalankan integrasi penuh dengan Apps Script.
13. Test manual print dan flow end-to-end.
14. Build dan deploy.

## 20. Kriteria Selesai

- [ ] Public user dapat membuat draft tanpa upload file.
- [ ] Draft menghasilkan ID pengajuan dan resume token.
- [ ] Form cabang tercetak A4 dengan blok tanda tangan sesuai versi lama.
- [ ] Draft dapat dilanjutkan dari localStorage, input ID, atau query URL.
- [ ] Submit final wajib file signed dan mengubah status ke `Baru`.
- [ ] Cek status publik menampilkan status aman tanpa detail pribadi.
- [ ] Admin valid dapat login dan logout.
- [ ] Dashboard hanya menampilkan status final.
- [ ] Search, filter, pagination dashboard bekerja.
- [ ] Detail pengajuan, item, file hard copy, dan riwayat tampil.
- [ ] Admin dapat update status, termasuk validasi catatan untuk `Ditolak`.
- [ ] Model baru masuk review dan bisa di-approve.
- [ ] Item `Disetujui` + produk `verified` muncul di antrean cetak.
- [ ] Admin dapat memilih jenis kartu Local/Import.
- [ ] Kartu garansi dapat dicetak memakai layout aktif.
- [ ] Admin dapat menyimpan, mengaktifkan, dan menghapus layout custom sesuai aturan backend.
- [ ] Admin dapat mark kartu sebagai `Printed`.
- [ ] Label cabang dibuat dari item `Printed` dan dapat dicetak A4.
- [ ] Frontend memakai Nuxt UI, TypeScript, runtime config, dan desain glassmorphism.
- [ ] Semua API tetap terhubung ke Google Apps Script dengan kontrak action yang sama.

## 21. Risiko dan Mitigasi

- [ ] Risiko CORS saat Nuxt berjalan di dev server/domain production.
  - Mitigasi: pertahankan `text/plain;charset=utf-8`; jika masih gagal, aktifkan server route proxy `/api/gas`.
- [ ] Risiko payload upload base64 besar.
  - Mitigasi: validasi ukuran sebelum convert dan sebelum submit; tampilkan error jelas.
- [ ] Risiko print bergeser dari template fisik.
  - Mitigasi: pertahankan CSS mm dari versi lama, tambah preview, dan lakukan uji manual Local/Import.
- [ ] Risiko token draft bocor lewat URL.
  - Mitigasi: bersihkan query setelah draft berhasil dimuat dan jangan log token.
- [ ] Risiko session admin hilang saat refresh SSR.
  - Mitigasi: baca session hanya di client dan tampilkan loading state sampai mounted.
- [ ] Risiko timezone tanggal berbeda antara browser dan Apps Script.
  - Mitigasi: kirim `tanggalForm` sebagai `YYYY-MM-DD`; format display lokal `id-ID`; filter tanggal memakai input date.

