aku ingin diskusi mendalam sebelum implementasi. jangan koding hingga ada konfirmasi dari saya.

yang ingin aku bahas adalah fitur auth dan authrization projek ini menggunakan supabase.
fitur yang mvp adalah :
1. basic login dan register.
2. Role-Based Authentication : admin, management, qrcc
3. fitur ini hanya khusus page "dashboard" saja. page public tidak pakai sistem auth dan otirisasi ini.
4. admin : bisa semua
5. management : hanya bisa lihat 
- "/dashboard"
- "/dashboard/pengajuan" hanya view saja, tidak bisa merubah data
6. qrcc : bisa akses semua, terkecuali setting "user management" atau "/dashboard/settings/members".
7. menggunakan nuxt module @nuxtjs/supabase

-------------------------------------------------------