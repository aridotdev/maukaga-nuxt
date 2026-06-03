# Keputusan Final Fitur Auth & Authorization Supabase

Tanggal keputusan: 2026-06-04

Dokumen ini merangkum keputusan final untuk fitur authentication dan authorization dashboard menggunakan Supabase dan Nuxt module `@nuxtjs/supabase`.

> Catatan: dokumen ini adalah keputusan desain. Implementasi kode dilakukan hanya setelah ada konfirmasi eksplisit berikutnya.

---

## 1. Scope MVP

Fitur auth dan authorization hanya berlaku untuk area dashboard.

- Public pages: tidak memakai auth dan tetap bisa diakses publik.
- Dashboard pages: semua route `/dashboard/**` wajib login dan wajib lolos authorization berdasarkan role.

---

## 2. Authentication

### Login

- Menggunakan Supabase Auth.
- Login menggunakan email dan password.
- Session dikelola melalui `@nuxtjs/supabase`.

### Register

Keputusan final:

- Tidak ada public register.
- User hanya dibuat atau di-invite oleh admin.
- Halaman `/register` publik tidak diperlukan untuk MVP ini.

### Email Confirmation

Keputusan final:

- Email confirmation wajib.
- User yang di-invite harus menerima email dari Supabase dan menyelesaikan proses aktivasi / set password sendiri.

---

## 3. First Admin

Keputusan final:

- Admin pertama dibuat manual melalui Supabase Dashboard / SQL.
- Setelah first admin tersedia, admin tersebut dapat membuat / invite user lain dari halaman user management.

---

## 4. Roles

Role MVP:

1. `admin`
2. `management`
3. `qrcc`

Tidak memakai public registration, sehingga role `pending` tidak wajib untuk MVP.

Namun, jika ada user yang berhasil login tetapi tidak memiliki profile / role yang valid, sistem harus memperlakukannya sebagai unauthorized dan mengarahkannya ke `/403`.

---

## 5. Role Permissions

### Admin

Admin memiliki akses penuh ke seluruh area dashboard.

Admin boleh:

- Mengakses semua route `/dashboard/**`.
- Melihat, membuat, mengubah, dan menghapus / menonaktifkan user.
- Mengubah role user.
- Membuat admin lain.
- Mengakses dan mengubah data pengajuan.

Guard penting:

- Admin tidak boleh menghapus admin terakhir.
- Admin tidak boleh downgrade role admin terakhir.
- Admin tidak boleh menonaktifkan admin terakhir.

### Management

Management hanya boleh mengakses:

- `/dashboard`
- `/dashboard/pengajuan`
- detail pengajuan di bawah `/dashboard/pengajuan/**`, jika route detail tersedia.

Management boleh:

- Melihat list pengajuan.
- Melihat detail pengajuan.

Management tidak boleh:

- Mengubah data pengajuan.
- Mengubah status pengajuan.
- Mengubah catatan admin / internal.
- Menghapus data pengajuan.
- Mengakses settings members.
- Mengakses route dashboard lain di luar allowlist.

Catatan export/download:

- Fitur export/download data pengajuan belum dibuat.
- Keputusan authorization untuk export/download dapat dibahas saat fitur tersebut akan dibuat.

### QRCC

QRCC boleh mengakses seluruh area dashboard kecuali user management.

QRCC boleh:

- Mengakses `/dashboard/**` secara umum.
- Melihat dan mengubah data pengajuan sesuai kebutuhan operasional.
- Mengakses settings lain jika nanti tersedia, selama bukan user management.

QRCC tidak boleh:

- Mengakses `/dashboard/settings/members`.
- Mengakses route turunan `/dashboard/settings/members/**`.
- Membuat user.
- Mengubah role user.
- Menghapus / menonaktifkan user.

---

## 6. Route Authorization Matrix

| Route | Admin | Management | QRCC |
|---|---:|---:|---:|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/dashboard/pengajuan` | ✅ full | ✅ view-only | ✅ full |
| `/dashboard/pengajuan/**` | ✅ full | ✅ view-only | ✅ full |
| `/dashboard/settings/members` | ✅ | ❌ | ❌ |
| `/dashboard/settings/members/**` | ✅ | ❌ | ❌ |
| `/dashboard/**` lainnya | ✅ | ❌ | ✅ |

Aturan konseptual:

```txt
admin:
  allow semua /dashboard/**

management:
  allow hanya:
    /dashboard
    /dashboard/pengajuan
    /dashboard/pengajuan/**

qrcc:
  allow semua /dashboard/**
  kecuali:
    /dashboard/settings/members
    /dashboard/settings/members/**
```

---

## 7. User Management MVP

Halaman user management:

- Route: `/dashboard/settings/members`
- Akses: admin only

Field user/member yang dikelola:

- `email`
- `full_name`
- `role`
- `is_active`

Fitur user management MVP:

1. List user.
2. Invite user via email.
3. Edit `full_name`.
4. Edit `role`.
5. Deactivate / soft delete user.
6. Reactivate user jika diperlukan.

Keputusan delete user:

- Menggunakan deactivate / soft delete.
- User tidak langsung dihapus permanen dari Supabase Auth sebagai default MVP.
- Tujuannya menjaga histori data dan mencegah relasi data rusak.

---

## 8. Invite User Flow

Keputusan final:

- Admin invite user via email.
- User menerima email invitation / confirmation dari Supabase.
- User set password sendiri.
- Admin menentukan role user saat invite atau saat mengedit member.

Flow konseptual:

```txt
Admin login
  -> buka /dashboard/settings/members
  -> invite user dengan email, full_name, role
  -> Supabase kirim email invitation
  -> user klik link email
  -> user set password sendiri
  -> user login
  -> sistem cek role dan is_active
  -> user masuk dashboard sesuai permission
```

---

## 9. Inactive User Behavior

Keputusan final:

- Jika user `is_active = false`, user tidak boleh mengakses dashboard.
- Jika user inactive mencoba masuk dashboard, redirect ke `/403`.

Catatan:

- Supabase login bisa saja berhasil secara auth-level.
- Guard aplikasi tetap harus menolak akses dashboard berdasarkan `is_active`.

---

## 10. Data Model Konseptual

Tabel profile/member aplikasi direkomendasikan menyimpan data role dan status user.

Konsep minimal:

```txt
profiles / members
  id uuid primary key references auth.users(id)
  email text
  full_name text nullable
  role text / enum: admin | management | qrcc
  is_active boolean
  created_at timestamptz
  updated_at timestamptz
```

Catatan:

- Role menjadi source of truth authorization aplikasi.
- User tanpa profile / role valid dianggap unauthorized.
- User non-admin tidak boleh mengubah role sendiri.

---

## 11. Static-Only Requirement untuk User Management

Aplikasi Nuxt ditargetkan tetap **static-only**.

- Node.js hanya diperlukan saat build / generate, bukan saat runtime production.
- Hasil `pnpm generate` dapat di-host di static hosting selama route fallback SPA tersedia.
- User management tidak memakai Nuxt/Nitro server endpoint jika target deployment tetap static-only.

Karena fitur user management membutuhkan operasi admin Supabase, maka operasi privileged Supabase Auth Admin harus berjalan di backend eksternal:

1. Rekomendasi utama: Supabase Edge Functions.
2. Alternatif: Google Apps Script sebagai privileged backend.

Service role key Supabase:

- Tidak boleh berada di Nuxt runtime config.
- Tidak boleh berada di `NUXT_PUBLIC_*`.
- Tidak boleh berada di bundle frontend / static output.
- Tidak boleh dikirim ke browser.
- Tidak boleh digunakan di Vue component / client-side composable.
- Hanya boleh disimpan di Supabase Edge Function secrets atau Google Apps Script Properties.

Operasi user yang boleh dilakukan dari Nuxt / browser dengan Supabase anon key:

- Login / logout via Supabase Auth.
- Ambil current session / current user.
- Ambil profile / role dari tabel `profiles` dengan RLS.
- Admin mengubah row `profiles` jika RLS mengizinkan.

Operasi user yang tidak boleh dilakukan langsung dari Nuxt / browser:

- Invite user via Supabase Auth Admin API.
- List semua Auth users via Admin API.
- Delete / ban / unban Auth user.
- Operasi apa pun yang membutuhkan service role key.

Endpoint konseptual jika memakai Supabase Edge Functions:

```txt
admin-users-list
admin-users-invite
admin-users-update
admin-users-deactivate
admin-users-reactivate
```

Action konseptual jika memakai Google Apps Script:

```txt
action: adminUsersList
action: adminUsersInvite
action: adminUsersUpdate
action: adminUsersDeactivate
action: adminUsersReactivate
```

Setiap endpoint / function admin wajib:

```txt
1. Validasi Supabase access token current user.
2. Ambil profile / role current user.
3. Pastikan current user adalah admin dan is_active = true.
4. Jika bukan admin, return 403.
5. Baru jalankan operasi dengan Supabase service role client di backend eksternal.
```

Integrasi Google Apps Script yang sudah ada perlu diarahkan ke Supabase session:

```txt
Nuxt mengirim Supabase access token ke Apps Script.
Apps Script memvalidasi token tersebut ke Supabase.
Apps Script cek profiles.role dan profiles.is_active.
Baru Apps Script menjalankan action dashboard yang diminta.
```

---

## 12. Supabase RLS Requirement

Authorization tidak boleh hanya mengandalkan UI atau route middleware.

RLS tetap wajib untuk melindungi data dari akses langsung melalui Supabase client.

Prinsip RLS:

### Profiles / Members

- User boleh membaca profile dirinya sendiri jika diperlukan.
- Admin boleh membaca semua profiles.
- Admin boleh mengubah role dan status user.
- Non-admin tidak boleh mengubah role.
- Non-admin tidak boleh mengubah `is_active`.

### Pengajuan

- Admin, management, dan QRCC boleh select data pengajuan.
- Management hanya read-only.
- Admin dan QRCC boleh melakukan mutation sesuai fitur yang tersedia.
- Management tidak boleh update/delete/ubah status/catatan meskipun mencoba lewat client Supabase langsung.

---

## 13. Nuxt Middleware Requirement

Middleware dashboard diperlukan untuk UX dan route protection.

Middleware konseptual:

### Dashboard Auth Guard

Untuk semua `/dashboard/**`:

```txt
Jika belum login:
  redirect ke /login
```

### Dashboard Role Guard

```txt
Ambil role user
Cek route tujuan
Jika role tidak punya akses:
  redirect ke /403
```

### Active User Guard

```txt
Jika is_active = false:
  redirect ke /403
```

### Guest Guard Login

Untuk `/login`:

```txt
Jika sudah login dan user valid:
  redirect ke /dashboard
```

---

## 14. UI Authorization Requirement

UI harus menyesuaikan role user, tetapi bukan menjadi satu-satunya lapisan keamanan.

Contoh behavior:

### Admin

- Melihat semua menu dashboard.
- Melihat menu Members.
- Melihat semua tombol action.

### Management

- Hanya melihat menu Dashboard dan Pengajuan.
- Pada Pengajuan hanya melihat list dan detail.
- Tombol edit/update/delete/status/catatan tidak ditampilkan.

### QRCC

- Melihat menu dashboard secara umum.
- Tidak melihat menu Members.
- Jika memaksa akses URL members, diarahkan ke `/403`.

---

## 15. Security Guard Penting

Guard yang wajib ada saat implementasi:

1. Public register tidak tersedia.
2. Semua `/dashboard/**` wajib login.
3. Role dashboard dicek sebelum route diakses.
4. `is_active = false` diarahkan ke `/403`.
5. Management read-only secara UI dan database/RLS.
6. QRCC tidak boleh akses members secara route maupun endpoint API.
7. Endpoint admin members hanya boleh dipakai oleh admin.
8. Service role key hanya boleh dipakai di server.
9. User tidak boleh mengubah role sendiri.
10. Tidak boleh menghapus, menonaktifkan, atau downgrade admin terakhir.

---

## 16. Keputusan Final Ringkas

```txt
A. Register tidak publik; user hanya dibuat/invite oleh admin.
B. First admin manual lewat Supabase Dashboard/SQL.
C. Management boleh lihat list + detail pengajuan, tidak boleh mutate.
D. QRCC boleh semua dashboard kecuali /dashboard/settings/members.
E. User management admin-only: full CRUD secara soft delete + ubah role.
F. Email confirmation wajib.
G. Delete user memakai deactivate / soft delete.
H. Invite email; user set password sendiri.
I. Field member: email, full_name, role, is_active.
J. Export/download pengajuan belum dibuat; authorization dibahas saat fitur dibuat.
K. User inactive redirect ke /403.
L. Admin boleh membuat admin lain, tapi tidak boleh menghapus/downgrade/deactivate admin terakhir.
M. Deployment target static-only; Nuxt tidak membutuhkan Node.js runtime production.
N. Supabase Auth Admin user CRUD dijalankan via Supabase Edge Functions atau Google Apps Script, bukan Nuxt/Nitro endpoint.
O. Service role key hanya boleh berada di backend eksternal, tidak di Nuxt/browser.
```
