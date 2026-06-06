title : refactor UForm di new.vue

task :
- refactor UForm agar mengikuti contoh penggunaan komponen UForm dari official doc https://ui.nuxt.com/docs/components/form
- penggunaan komponen UForm ini schema validation pakai zod
- gunakan error handling dan semua fitur UForm dari official doc.
- setelah penggunaan UForm mengikuti panduan official doc, kamu bisa hapus function error handling manual yang sebelumnya ada
- buat plan dulu, nanti saya konfirmasi jika mau implementasi

scope :
- kerjakan hanya form di halaman new.vue saja. jangan yang lain
- gunakan zod untuk validasi
- harus ikuti contoh kode official doc
- jangan buat function manual jika sudah ada built in dari komponen tersebut
- saya akan lakukan typecheck dan lint sendiri

larangan:
- ubah kode lain yang sudah ada dan benar.
- jangan berasumsi, lihat official doc jika kamu tidak yakin.