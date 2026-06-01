# Brief Implementasi Detail Pengajuan

## Tujuan
Membuat flow Detail Pengajuan untuk dashboard admin Nuxt berdasarkan `idPengajuan`.

Tombol Detail pada `app/components/home/HomePengajuan.vue` tidak boleh hanya membuka data row ringkas. Detail harus mengambil data lengkap dari backend menggunakan action `getDetail` karena `getDashboard` hanya mengirim data ringkas.

## Sumber Kebenaran

### Backend/API
Gunakan `doc/Code.gs` sebagai sumber kebenaran kontrak API dan aturan status.

Action penting:
- `getDashboard` — mengambil daftar ringkas pengajuan untuk dashboard.
- `getDetail` — mengambil detail lengkap berdasarkan `idPengajuan`.
- `updateStatus` — menyimpan perubahan status dan catatan admin.

Status valid:
- `Baru`
- `Disetujui`
- `Ditolak`
- `Selesai`

Aturan backend yang wajib diikuti:
- Semua request admin harus memakai token session.
- `getDetail` wajib menerima `idPengajuan`.
- `updateStatus` wajib menerima `idPengajuan`, `statusBaru`, dan `catatanAdmin`.
- `statusBaru` harus salah satu dari status valid.
- Jika `statusBaru` adalah `Ditolak`, `catatanAdmin` wajib diisi.
- Setelah `updateStatus` sukses, backend memperbarui data pengajuan dan menambah row ke `StatusLog`.

Catatan penting:
- Backend saat ini tidak membatasi transisi antar status selama status baru valid.
- UI menggunakan guard ringan, bukan restriction ketat.

### Referensi UI Lama
Gunakan `doc/dashboard.html` sebagai referensi perilaku flow lama.

Flow referensi:
- Tombol Detail memanggil `loadDetail(idPengajuan)`.
- `loadDetail` memanggil action `getDetail`.
- Halaman detail menampilkan:
  - informasi pengajuan,
  - daftar item,
  - form update status/catatan admin,
  - riwayat status.
- Submit status memanggil action `updateStatus`.
- Setelah sukses, detail dimuat ulang.

## Keputusan UI Utama

Gunakan halaman detail berbasis ID, bukan modal.

Route yang disarankan:
- `/dashboard/pengajuan/[id]`

Alasan:
- Detail pengajuan berisi banyak section dan bukan sekadar preview.
- Admin perlu refresh halaman tanpa kehilangan konteks ID.
- URL bisa dibagikan/bookmark untuk follow-up pengajuan tertentu.
- Browser back/forward lebih natural.
- Update status/catatan adalah aksi administratif dengan riwayat audit.
- Modal terlalu sempit untuk informasi pengajuan, item, form status, dan riwayat.

Modal hanya boleh dipertimbangkan nanti sebagai quick preview, bukan flow utama update status.

## Flow Tombol Detail

Pada `app/components/home/HomePengajuan.vue`, tombol Detail harus membuka halaman detail berdasarkan `idPengajuan`.

Behavior yang diharapkan:
- Klik Detail pada row pengajuan.
- Navigasi ke `/dashboard/pengajuan/{idPengajuan}`.
- Halaman detail mengambil `id` dari route params.
- Halaman detail memanggil action `getDetail` dengan payload `{ idPengajuan }`.

Jangan mengandalkan data row dashboard sebagai sumber detail karena data tersebut hanya ringkasan.

## Struktur Halaman Detail

Halaman detail sebaiknya memiliki section berikut:

### 1. Header
Tampilkan:
- ID Pengajuan,
- status badge,
- tombol kembali ke dashboard.

### 2. Informasi Pengajuan
Tampilkan data dari `getDetail`:
- ID Pengajuan,
- waktu submit,
- nama,
- bagian/cabang,
- pemilik,
- tanggal form,
- alasan pengajuan,
- catatan tambahan,
- jumlah item,
- file hard copy jika tersedia.

### 3. Daftar Item
Tampilkan item dari response `getDetail.items`:
- no item,
- produk,
- model,
- nomor seri,
- status verifikasi nama produk.

Jika `produkStatus` bukan `verified`, tampilkan badge/peringatan bahwa nama produk belum terverifikasi.

### 4. Update Status / Catatan
Tampilkan:
- select status baru,
- textarea catatan admin,
- tombol Simpan Status.

Keputusan diskusi: catatan admin bersifat **status only**.

Artinya:
- Catatan admin hanya disimpan saat status berubah.
- Jika status tidak berubah, jangan panggil `updateStatus` hanya untuk mengubah catatan.
- Jika status dan catatan tidak berubah, tampilkan pesan bahwa tidak ada perubahan.

Label tombol sebaiknya tetap `Simpan Status`, bukan `Simpan Status / Catatan`, karena catatan hanya ikut status change.

### 5. Riwayat Status
Tampilkan data dari `getDetail.riwayat`:
- timestamp,
- status lama → status baru,
- catatan admin,
- user/admin.

Riwayat harus diperbarui setelah update status berhasil.

## Flow Status yang Disepakati

Gunakan pendekatan **guard ringan**.

Artinya:
- UI tidak membatasi transisi status secara ketat.
- Semua status valid tetap tersedia di select.
- UI memberi warning/confirm untuk mencegah salah update.
- Backend tetap menjadi sumber kebenaran validasi final.

### Status Valid
- `Baru`
- `Disetujui`
- `Ditolak`
- `Selesai`

### Aturan Wajib UI

#### Ditolak
Jika status baru adalah `Ditolak`:
- `catatanAdmin` wajib diisi.
- Jika kosong, tampilkan error dan jangan submit.

Alasan:
- Backend `Code.gs` juga mewajibkan catatan untuk status `Ditolak`.

#### Status Tidak Berubah
Jika status baru sama dengan status saat ini:
- Jangan submit `updateStatus`.
- Karena keputusan diskusi adalah catatan admin bersifat status only.
- Tampilkan pesan seperti: `Tidak ada perubahan status untuk disimpan.`

#### Setelah Sukses
Setelah `updateStatus` sukses:
- tampilkan pesan sukses,
- panggil ulang `getDetail`,
- update status saat ini,
- update metadata terakhir,
- update riwayat status.

## Guard Ringan untuk Transisi Status

### Baru → Disetujui
Flow normal. Tidak perlu confirm.

Jika ada item belum verified, tampilkan warning:
> Ada item dengan Nama Produk belum terverifikasi. Pengajuan tetap bisa disetujui, tetapi item tersebut belum masuk antrean cetak sampai diverifikasi.

Alasan:
- Di `Code.gs`, antrean cetak hanya mengambil pengajuan `Disetujui`.
- Item yang masuk antrean cetak juga harus `produk_status === 'verified'`.

### Baru → Ditolak
Flow normal, tetapi catatan wajib.

### Disetujui → Selesai
Tampilkan confirm ringan:
> Tandai pengajuan ini sebagai Selesai? Pastikan proses kartu garansi sudah selesai.

Alasan:
- Antrean cetak hanya mengambil status `Disetujui`.
- Setelah menjadi `Selesai`, pengajuan tidak lagi tampil sebagai antrean aktif.

### Disetujui → Ditolak
Tampilkan confirm:
> Pengajuan ini sudah disetujui. Yakin ingin mengubahnya menjadi Ditolak?

### Ditolak → Disetujui
Tampilkan confirm:
> Pengajuan ini sebelumnya ditolak. Yakin ingin menyetujuinya?

### Selesai → Status Lain
Tampilkan confirm kuat:
> Pengajuan ini sudah Selesai. Yakin ingin membuka ulang statusnya?

## Hubungan Status dengan Antrean Cetak

Penting untuk implementasi:
- Status `Disetujui` adalah pintu masuk antrean cetak.
- Antrean cetak hanya mengambil pengajuan dengan status `Disetujui`.
- Item yang masuk antrean cetak harus memiliki `produk_status === 'verified'`.
- Status `Selesai` tidak masuk antrean cetak aktif.

Karena itu, halaman detail harus menjelaskan konsekuensi status kepada admin melalui warning/confirm, bukan membatasi secara keras.

## Error dan Session Handling

Jika API mengembalikan error `Unauthorized`:
- hapus session admin di client,
- arahkan ke halaman login.

Jika `getDetail` mengembalikan `Pengajuan tidak ditemukan`:
- tampilkan empty/error state di halaman detail,
- sediakan tombol kembali ke dashboard.

Jika `updateStatus` gagal:
- tampilkan error di section update status,
- jangan mengubah state lokal sebelum API sukses.

## Verification Checklist

Setelah implementasi nanti, verifikasi:

1. Klik Detail dari dashboard membuka `/dashboard/pengajuan/{idPengajuan}`.
2. Refresh halaman detail tetap memuat data berdasarkan ID.
3. Data informasi pengajuan sesuai response `getDetail`.
4. Daftar item tampil lengkap.
5. Badge item belum verified tampil jika `produkStatus` bukan `verified`.
6. Status `Ditolak` tanpa catatan ditolak oleh UI sebelum submit.
7. Status sama dengan status saat ini tidak memanggil `updateStatus`.
8. Transisi sensitif menampilkan confirm.
9. Setelah update sukses, detail dan riwayat reload.
10. Token hilang/expired mengarah ke login.
11. Tombol kembali membawa user ke dashboard.

## File Referensi

- `doc/Code.gs`
- `doc/dashboard.html`
- `app/components/home/HomePengajuan.vue`
