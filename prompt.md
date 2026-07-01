aku ingin diskusi tanpa koding terlebih dahulu

title : tambahkan kategori Local / Import di product model

tugas :
- lihat kondisi sekarang pemilahan kartu garansi local / import saat proses cetak kartu garansi
- lihat data product model, saat ini hanya ada model, nama produk dan status.
- periksa apakah data produk model bisa ditambahkan data pabrikan dengan isi "local" / "import" (agar sama dengan data jenis kartu garansi saat ini)

goal :
- ketika mau cetak kartu garansi, dan data pabrikan sudah ada (local/import), maka bisa langsung cetak dan tidak perlu lagi tentukan manual jenis kartu.
- tapi jika belum ada, user tetap bisa tentukan jenis kartu (local/import) dan data baru tersebut masuk ke data product model.
- buat perbaikan kode minimal dan tidak merusak dan merubah kode lain yang sudah ada 

batasan :
- tidak merusak dan merubah kode lain yang sudah ada.
- fokus tugas ini saja


ok, setuju dengan jalur yang paling aman. mari implementasikan :
1. implementasikan di core app saja, cs-web dan admin-web tidak perlu saat ini.
2. app/components/home/HomeReviewProductName.vue (line 87)
Opsional. Kalau ingin saat approve model baru langsung pilih origin, file ini perlu ikut diubah. Kalau mau minimal, biarkan dulu; origin bisa terisi nanti saat cetak kartu pertama kali. ya aku pilih biarkan dulu.
