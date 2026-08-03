Ya, masih ada sisa yang terkait **Status Item**, tapi bukan lagi di tabel daftar pengajuan yang tadi kita sederhanakan.

Yang masih ada:

| Area | File | Catatan |
|---|---|---|
| Backend Apps Script | [Code.gs](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/doc/Code.gs:29>) | Masih ada kolom sheet `Status Item`, fungsi update item, migrasi data lama, dan response detail/check-status. |
| Detail pengajuan admin | [usePengajuanDetail.ts](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/app/composables/usePengajuanDetail.ts:33>) dan [[idPengajuan].vue](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/app/pages/dashboard/pengajuan/[idPengajuan].vue:436>) | Halaman detail masih membaca dan menampilkan `statusItem`. |
| Cek status publik | [check-status.vue](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/app/pages/check-status.vue:22>) dan [cs-web/check-status.vue](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/apps/cs-web/pages/check-status.vue:22>) | Masih pakai `statusItem` sebagai fallback saat cek berdasarkan nomor seri. |
| Dokumentasi | [specs.md](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/doc/specs.md:26>) dan [prd.md](<D:/ARISAFARI/Works/Project Applications/maukaga-nuxt/doc/prd.md:177>) | Masih menjelaskan konsep lama `Status Item`. |
| Naming lama | `itemStatuses` di beberapa file | Namanya masih “statuses”, tapi sekarang di daftar pengajuan isinya dipakai sebagai daftar item + keputusan, bukan kolom status item lagi. |

Kesimpulannya: **di tabel daftar pengajuan, Status Item sudah hilang.** Tapi secara sistem, konsep `Status Item` masih hidup di backend, halaman detail, cek status publik, dan dokumentasi.

Kalau mau benar-benar bersih total, tahap berikutnya adalah refactor lebih besar: ubah `statusItem` menjadi hanya `keputusanItem`, rename `itemStatuses` menjadi misalnya `items`, lalu update detail, check-status, backend Apps Script, dan docs.