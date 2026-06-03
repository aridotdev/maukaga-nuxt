# Prompt Implementasi: Email Reminder Pengajuan Status Baru

## Tujuan

Ubah email digest Mau KaGa menjadi email reminder sederhana untuk admin.

Email hanya dikirim jika ada pengajuan dengan status `Baru`. Fungsi email ini bukan lagi laporan semua pengajuan terbuka, melainkan pengingat agar admin segera membuka dashboard dan memproses pengajuan baru.

Isi email harus simpel:

> Ada xxx pengajuan status "Baru" yang harus diproses.

## Konteks Sistem

- Project utama adalah Nuxt di repo ini.
- Backend/API utama masih Google Apps Script di `doc/Code.gs`.
- Email dikirim dari Google Apps Script memakai `MailApp.sendEmail({ to, subject, htmlBody })`.
- Fungsi email yang berjalan saat ini ada di `doc/Code.gs`:
  - `sendEmailDigest()`
  - `buildDigestHtml_(rows, config)`
  - `ensureEmailDigestTrigger_()`
- `setupApp()` membuat trigger time-based untuk `sendEmailDigest`.
- Trigger saat ini:
  - Senin sekitar pukul 09:00.
  - Kamis sekitar pukul 09:00.
- Penerima email diambil dari sheet `EmailRecipients`.
- Penerima aktif adalah row dengan:
  - `Aktif` bernilai `yes`.
  - `Email` tidak kosong.
- Log pengiriman dicatat ke sheet `EmailLog`.
- Config `LAST_EMAIL_SENT_AT` saat ini ada, tetapi implementasi lama tidak benar-benar memakainya untuk membatasi data baru sejak email terakhir.

## Status Pengajuan

Status yang relevan:

- `Menunggu Upload`: draft, belum final, jangan masuk email admin.
- `Baru`: pengajuan final sudah masuk dan menunggu diproses admin.
- `Disetujui`: sudah diproses admin, jangan masuk email reminder baru.
- `Ditolak`: sudah diproses admin, jangan masuk email reminder baru.
- `Selesai`: sudah selesai, jangan masuk email reminder baru.

Keputusan baru:

- Email reminder hanya menghitung pengajuan dengan status persis `Baru`.
- Status `Disetujui` tidak lagi dimasukkan ke email.
- Status `Menunggu Upload`, `Ditolak`, dan `Selesai` juga tidak dimasukkan.

## Perilaku yang Diinginkan

1. Saat `sendEmailDigest()` berjalan, sistem membaca semua row dari sheet `Pengajuan`.
2. Sistem filter hanya row dengan `Status === 'Baru'`.
3. Jika jumlah pengajuan status `Baru` adalah 0:
   - Jangan kirim email.
   - Catat ke `EmailLog` dengan status seperti `Tidak ada pengajuan status Baru`.
4. Jika jumlah pengajuan status `Baru` lebih dari 0:
   - Kirim email ke semua penerima aktif dari `EmailRecipients`.
   - Subject menyebut jumlah pengajuan baru.
   - Body email hanya memberi pengingat sederhana.
   - Catat ke `EmailLog` dengan jumlah pengajuan status `Baru` dan status `Terkirim`.

## Keputusan Penting tentang Reminder

Email ini boleh mengingatkan pengajuan `Baru` yang sama berulang kali selama statusnya belum diproses.

Alasannya: tujuan email adalah reminder untuk admin. Jika ada pengajuan yang tetap berstatus `Baru`, berarti masih perlu dicek/diproses. Jadi jangan memakai `LAST_EMAIL_SENT_AT` untuk menyembunyikan pengajuan lama yang masih berstatus `Baru`.

Dengan keputusan ini:

- `LAST_EMAIL_SENT_AT` boleh tetap di-update sebagai audit waktu email berhasil dikirim.
- `LAST_EMAIL_SENT_AT` jangan dipakai sebagai filter utama.
- Jangan hanya mengirim pengajuan yang dibuat sejak email terakhir.
- Selama status masih `Baru`, pengajuan tersebut tetap dihitung di reminder berikutnya.

## Copy Email

Subject yang disarankan:

```text
[Mau KaGa] {count} pengajuan baru perlu diproses
```

Jika memakai `APP_NAME` dari config:

```text
[{APP_NAME}] {count} pengajuan baru perlu diproses
```

Body HTML yang diinginkan, versi paling simpel:

```text
Ada {count} pengajuan status "Baru" yang harus diproses.
Silakan cek dashboard admin Mau KaGa.
```

Tambahan yang masih boleh karena tetap simpel:

- Nama aplikasi.
- Waktu email dibuat.
- Badge/count besar.
- Kalimat pendek ajakan cek dashboard.

Yang tidak perlu:

- Tabel detail panjang.
- Daftar semua item.
- Ringkasan item.
- Status lain selain `Baru`.
- Desain kompleks.

## Desain HTML Email

Email sebaiknya tetap berupa HTML sederhana yang aman untuk email client.

Panduan desain:

- Gunakan layout lebar maksimal sekitar 600px.
- Gunakan inline CSS karena email client sering menghapus CSS eksternal.
- Jangan bergantung pada Tailwind, Nuxt UI, class CSS project, atau JavaScript.
- Jangan memakai Vue component langsung di Apps Script.
- Warna boleh mengikuti identitas Mau KaGa:
  - aksen hijau/lime untuk angka count.
  - teks gelap.
  - background terang.
- Fokus utama adalah angka jumlah pengajuan `Baru`.

Contoh struktur visual:

- Header kecil: `Mau KaGa`
- Judul: `Pengajuan Baru Perlu Diproses`
- Count besar: `{count}`
- Teks: `Ada {count} pengajuan status "Baru" yang harus diproses.`
- Footer kecil: `Email ini dikirim otomatis oleh sistem Mau KaGa.`

## Tentang Komponen di Project Nuxt

Boleh membuat komponen Nuxt untuk preview desain email di project ini, misalnya:

```text
app/components/email/NewSubmissionReminderEmail.vue
```

Namun perlu dipahami:

- Komponen Vue hanya untuk preview, dokumentasi, atau menyepakati tampilan.
- Email asli tetap harus dibuat sebagai HTML string di `doc/Code.gs`.
- Google Apps Script `MailApp` tidak bisa langsung merender Vue component.
- Jika nanti dibuat komponen preview, jaga agar markup-nya mudah diterjemahkan ke HTML inline di `Code.gs`.

Untuk fase implementasi sederhana, komponen preview tidak wajib. Yang wajib adalah perilaku email di `doc/Code.gs`.

## Target Perubahan di Code.gs Nanti

File:

```text
doc/Code.gs
```

Area utama:

```text
sendEmailDigest()
buildDigestHtml_(rows, config)
```

Catatan:

- Nama `sendEmailDigest()` sebaiknya tetap dipertahankan karena trigger Apps Script saat ini mengarah ke fungsi itu.
- Boleh mengganti isi `buildDigestHtml_` atau membuat helper baru seperti `buildNewSubmissionReminderHtml_(count, config)`.
- Jika membuat helper baru, pastikan `sendEmailDigest()` memanggil helper tersebut.

Filter lama yang perlu diubah secara konsep:

```js
['Baru', 'Disetujui'].indexOf(row['Status']) !== -1
```

Menjadi konsep:

```js
clean_(row['Status']) === 'Baru'
```

Catatan:

- Gunakan `clean_()` agar spasi tidak membuat filter gagal.
- Hitung semua row status `Baru`, bukan hanya 100 terbaru, karena email hanya membutuhkan jumlah.
- Jika nanti tetap ingin membatasi query untuk performa, pastikan angka count yang dikirim tetap mencerminkan total status `Baru`.

## Acceptance Criteria

- Jika tidak ada penerima aktif:
  - Email tidak dikirim.
  - `EmailLog` mencatat `Tidak ada penerima aktif`.
- Jika ada penerima aktif tetapi tidak ada pengajuan status `Baru`:
  - Email tidak dikirim.
  - `EmailLog` mencatat `Tidak ada pengajuan status Baru`.
- Jika ada 1 atau lebih pengajuan status `Baru`:
  - Email dikirim ke semua penerima aktif.
  - Subject mengandung jumlah pengajuan status `Baru`.
  - Body mengandung kalimat: `Ada {count} pengajuan status "Baru" yang harus diproses.`
  - Email tidak menyebut atau menghitung status `Disetujui`.
  - Email tidak menyebut atau menghitung status `Ditolak`.
  - Email tidak menyebut atau menghitung status `Selesai`.
  - Email tidak menyebut atau menghitung status `Menunggu Upload`.
  - `EmailLog` mencatat jumlah pengajuan status `Baru` dan status `Terkirim`.
- Pengajuan yang masih status `Baru` tetap dihitung pada trigger berikutnya.

## Skenario Uji Manual

1. Sheet `Pengajuan` kosong atau tidak ada status `Baru`.
   - Jalankan `sendEmailDigest()`.
   - Pastikan tidak ada email terkirim.
   - Pastikan `EmailLog` mencatat tidak ada pengajuan status `Baru`.
2. Sheet `Pengajuan` punya 1 row status `Baru`.
   - Jalankan `sendEmailDigest()`.
   - Pastikan email terkirim.
   - Pastikan subject/body menyebut 1 pengajuan baru.
3. Sheet `Pengajuan` punya campuran status:
   - 2 row `Baru`.
   - 3 row `Disetujui`.
   - 1 row `Ditolak`.
   - 1 row `Selesai`.
   - Jalankan `sendEmailDigest()`.
   - Pastikan email hanya menyebut 2 pengajuan status `Baru`.
4. Jalankan lagi tanpa mengubah status.
   - Email tetap boleh terkirim dengan jumlah yang sama karena ini reminder.
5. Ubah semua status `Baru` menjadi `Disetujui`.
   - Jalankan `sendEmailDigest()`.
   - Pastikan email tidak dikirim.

## Hal yang Tidak Dikerjakan Dulu

- Jangan membuat email detail dengan tabel panjang.
- Jangan membuat ringkasan item.
- Jangan mengubah jadwal trigger kecuali diminta.
- Jangan mengubah alur submit pengajuan.
- Jangan mengubah status lifecycle.
- Jangan memakai `LAST_EMAIL_SENT_AT` untuk menyaring pengajuan yang sudah pernah masuk email.
- Jangan memindahkan pengiriman email ke Nuxt.

## Ringkasan Keputusan

Email reminder admin Mau KaGa harus sederhana dan berulang selama masih ada pengajuan status `Baru`.

Inti pesan:

```text
Ada xxx pengajuan status "Baru" yang harus diproses.
```

Sumber data tetap Google Sheets via Apps Script. Pengiriman tetap dari `doc/Code.gs`. Komponen Nuxt boleh dibuat hanya untuk preview tampilan, bukan sebagai sumber pengiriman email asli.
