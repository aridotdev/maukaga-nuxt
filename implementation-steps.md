# Implementation Steps: Auth & Authorization Dashboard

Berdasarkan: `task-plan.md` - Keputusan Final Fitur Auth & Authorization Supabase  
Tanggal referensi keputusan: 2026-06-04  
Revisi Supabase current flow: 2026-06-04

> Dokumen ini adalah panduan implementasi bertahap. Setiap fase harus selesai dan diverifikasi sebelum lanjut ke fase berikutnya.

---

## Catatan Penting Revisi

Panduan lama masih memakai beberapa pola Supabase lama. Versi ini sudah disesuaikan dengan perubahan besar Supabase saat ini:

- Supabase sekarang mendorong API key baru: `publishable key` untuk client/browser dan `secret key` untuk backend tepercaya. Legacy `anon` dan `service_role` masih bisa muncul di dashboard, tetapi jangan jadikan nama itu patokan utama.
- `secret key` atau legacy `service_role key` tetap tidak boleh masuk ke Nuxt, runtime config public, bundle static, atau browser.
- Invite user harus memakai Supabase Auth Admin invite flow, bukan create-user biasa. Untuk raw REST di GAS, gunakan `/auth/v1/invite`, bukan `/auth/v1/admin/users`.
- Invite email Supabase tidak memakai PKCE flow. Callback `/confirm` harus bisa membaca token dari URL fragment (`#access_token=...`) lalu menampilkan form set password.
- Project ini memakai Nuxt source directory `app/`, jadi file baru dibuat di `app/pages`, `app/composables`, dan `app/middleware`.
- Karena target deploy static-only, proteksi route dashboard dilakukan oleh Nuxt route middleware client-side dan RLS/database tetap menjadi lapisan keamanan utama.

---

## Gambaran Umum Fase

```txt
Fase 1 -> Supabase: database, auth, keys, redirect URL
Fase 2 -> Nuxt: module, runtime config, static route rules
Fase 3 -> Session, profile, dan route middleware
Fase 4 -> Login, invite callback, set password, logout
Fase 5 -> User management via Google Apps Script
Fase 6 -> RLS policies dan grants
Fase 7 -> UI authorization
Fase 8 -> Halaman /403
Fase 9 -> Testing & security checklist
```

---

## Fase 1 - Supabase: Database & Auth Setup

### 1.1 - Buat project Supabase

Buat project baru di [supabase.com](https://supabase.com), lalu simpan:

- `Project URL`
- `publishable key` untuk Nuxt/browser dan validasi user di GAS
- `secret key` untuk GAS saja

Catatan kompatibilitas:

- Jika dashboard masih menampilkan legacy key, `anon public key` setara dengan `publishable key`.
- Jika dashboard masih menampilkan legacy key, `service_role key` setara dengan backend admin key.
- Jangan pernah memasukkan `secret key` atau `service_role key` ke Nuxt.

### 1.2 - Konfigurasi Email Auth

Di Supabase Dashboard:

```txt
Authentication -> Sign In / Providers -> Email
```

Set:

- Allow new users to sign up: OFF
- Confirm email: ON

Tujuan:

- Tidak ada public register.
- User hanya dibuat lewat invite admin.
- User harus menyelesaikan aktivasi email sebelum memakai dashboard.

Label dashboard Supabase bisa berubah, tetapi intinya adalah sign-up publik dimatikan dan email confirmation dinyalakan.

### 1.3 - Konfigurasi Site URL dan Redirect URLs

Di Supabase Dashboard:

```txt
Authentication -> URL Configuration
```

Set:

```txt
Site URL:
  http://localhost:3000

Redirect URLs:
  http://localhost:3000/confirm
  https://domain-produksi-kamu.com/confirm
```

Saat production sudah jelas, ganti/tambahkan domain production. Callback invite Supabase harus diarahkan ke `/confirm`.

### 1.4 - Buat tabel `profiles`

Jalankan SQL berikut di Supabase SQL Editor.

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'qrcc'
    check (role in ('admin', 'management', 'qrcc')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();
```

### 1.5 - Auto-create profile saat user dibuat/invite

Invite Supabase dapat membawa metadata. Trigger ini membaca `full_name` dan `role` dari metadata jika ada.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case
      when requested_role in ('admin', 'management', 'qrcc') then requested_role
      else 'qrcc'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 1.6 - Buat first admin secara manual

Karena public register mati, admin pertama dibuat manual.

Langkah:

1. Supabase Dashboard -> Authentication -> Users -> Invite user.
2. Masukkan email admin pertama.
3. Setelah user muncul di list, catat `user id`.
4. Jalankan SQL:

```sql
update public.profiles
set role = 'admin',
    full_name = 'Nama Admin Pertama',
    is_active = true
where id = '3fafaf50-e6c2-43f0-a3ca-9a64883f19e3';
```

5. Admin pertama buka email invite, masuk ke `/confirm`, set password, lalu login.

---

## Fase 2 - Nuxt: Konfigurasi & Supabase Module

### 2.1 - Install dependency

```bash
pnpm add @nuxtjs/supabase
```

### 2.2 - Environment variables

Buat atau update `.env` lokal. Untuk module Nuxt, nama env yang paling aman adalah:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxxxxxx
NUXT_PUBLIC_APPS_SCRIPT_API_URL=https://script.google.com/macros/s/xxxxx/exec
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

Catatan:

- `NUXT_PUBLIC_SUPABASE_KEY` diisi publishable key.
- Jangan isi secret key/service role key di `.env` Nuxt.
- Pastikan `.env` ada di `.gitignore`.

### 2.3 - Konfigurasi `nuxt.config.ts`

Project ini sudah memakai `app/` sebagai source directory. Tambahkan `@nuxtjs/supabase` ke module existing dan merge config baru tanpa menghapus key `runtimeConfig.public` yang sudah ada.

```ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/fonts',
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxtjs/supabase'
  ],

  runtimeConfig: {
    public: {
      // Pertahankan config public existing seperti appName, maxUploadMb, maxItems, dll.
      appsScriptApiUrl: import.meta.env.NUXT_PUBLIC_APPS_SCRIPT_API_URL,
      appUrl: import.meta.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },

  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/login', '/confirm', '/403']
    }
  },

  routeRules: {
    '/login': { ssr: false },
    '/confirm': { ssr: false },
    '/403': { ssr: false },
    '/dashboard/**': { ssr: false }
  }
})
```

Kenapa `redirect: false`:

- Module redirect global mudah membuat public pages ikut terkunci.
- MVP ini hanya mengunci `/dashboard/**`.
- Route guard manual lebih jelas untuk target static-only.

---

## Fase 3 - Session, Profile, dan Middleware

### 3.1 - Buat composable `useCurrentSession()`

Buat file `app/composables/useCurrentSession.ts`.

```ts
export function useCurrentSession() {
  const supabase = useSupabaseClient()
  const sessionState = useSupabaseSession()

  async function getSession() {
    if (sessionState.value) return sessionState.value

    const { data, error } = await supabase.auth.getSession()
    if (error) throw error

    sessionState.value = data.session
    return data.session
  }

  return { session: sessionState, getSession }
}
```

### 3.2 - Buat composable `useUserProfile()`

Buat file `app/composables/useUserProfile.ts`.

```ts
type UserRole = 'admin' | 'management' | 'qrcc'

type UserProfile = {
  role: UserRole
  is_active: boolean
  full_name: string | null
}

export function useUserProfile() {
  const supabase = useSupabaseClient()
  const { getSession } = useCurrentSession()

  const profile = useState<UserProfile | null>('user-profile', () => null)

  async function fetchProfile() {
    const session = await getSession()
    const userId = session?.user?.id

    if (!userId) {
      profile.value = null
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role, is_active, full_name')
      .eq('id', userId)
      .single()

    if (error || !data) {
      profile.value = null
      return null
    }

    profile.value = data as UserProfile
    return profile.value
  }

  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isManagement = computed(() => profile.value?.role === 'management')
  const isQrcc = computed(() => profile.value?.role === 'qrcc')
  const isActive = computed(() => profile.value?.is_active === true)
  const hasValidRole = computed(() =>
    ['admin', 'management', 'qrcc'].includes(profile.value?.role ?? '')
  )

  return {
    profile,
    fetchProfile,
    isAdmin,
    isManagement,
    isQrcc,
    isActive,
    hasValidRole
  }
}
```

Catatan penting:

- Jangan bergantung pada `useSupabaseUser().id`.
- Pada versi baru module, user state bisa berupa JWT claims. Source of truth paling aman untuk user id adalah `useSupabaseSession().value?.user.id`.

### 3.3 - Middleware `auth-guard`

Buat file `app/middleware/auth-guard.ts`.

```ts
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { getSession } = useCurrentSession()
  const session = await getSession()

  if (!session) {
    return navigateTo('/login')
  }

  const { profile, fetchProfile, hasValidRole, isActive } = useUserProfile()

  if (!profile.value) {
    await fetchProfile()
  }

  if (!hasValidRole.value || !isActive.value) {
    return navigateTo('/403')
  }
})
```

### 3.4 - Middleware `role-guard`

Buat file `app/middleware/role-guard.ts`.

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { profile, fetchProfile, isAdmin, isManagement } = useUserProfile()

  if (!profile.value) {
    await fetchProfile()
  }

  const path = to.path

  if (path.startsWith('/dashboard/settings/members')) {
    if (!isAdmin.value) return navigateTo('/403')
    return
  }

  if (isManagement.value) {
    const allowed =
      path === '/dashboard' ||
      path === '/dashboard/pengajuan' ||
      path.startsWith('/dashboard/pengajuan/')

    if (!allowed) return navigateTo('/403')
  }
})
```

### 3.5 - Middleware `guest-guard`

Buat file `app/middleware/guest-guard.ts`.

```ts
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { getSession } = useCurrentSession()
  const session = await getSession()

  if (!session) return

  const { profile, fetchProfile, hasValidRole, isActive } = useUserProfile()

  if (!profile.value) {
    await fetchProfile()
  }

  if (hasValidRole.value && isActive.value) {
    return navigateTo('/dashboard')
  }
})
```

### 3.6 - Pasang middleware di halaman

Di semua halaman `app/pages/dashboard/**`:

```ts
definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})
```

Di `app/pages/login.vue`:

```ts
definePageMeta({
  middleware: ['guest-guard']
})
```

---

## Fase 4 - Login, Invite Callback, Set Password, Logout

### 4.1 - Halaman `/login`

Update `app/pages/login.vue` memakai Supabase Auth password login.

```vue
<script setup lang="ts">
definePageMeta({ middleware: ['guest-guard'] })

const supabase = useSupabaseClient()
const loading = ref(false)
const errorMessage = ref('')
const form = reactive({ email: '', password: '' })

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  await navigateTo('/dashboard')
}
</script>
```

### 4.2 - Halaman `/confirm` untuk invite dan set password

Buat file `app/pages/confirm.vue`.

Supabase invite link dapat kembali dengan token di URL fragment. Halaman ini harus:

1. Membaca `access_token` dan `refresh_token` dari hash URL.
2. Memanggil `supabase.auth.setSession()`.
3. Menampilkan form set password.
4. Memanggil `supabase.auth.updateUser({ password })`.
5. Redirect ke `/dashboard`.

```vue
<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const password = ref('')

onMounted(async () => {
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (error) throw error

      await router.replace({ path: '/confirm', hash: '' })
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Gagal memverifikasi undangan.'
  } finally {
    loading.value = false
  }
})

async function handleSetPassword() {
  saving.value = true
  errorMessage.value = ''

  const { error } = await supabase.auth.updateUser({
    password: password.value
  })

  saving.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  await navigateTo('/dashboard')
}
</script>
```

Tambahkan template sesuai desain aplikasi. Minimal harus ada input password, pesan error, dan tombol submit.

### 4.3 - Logout

```ts
const supabase = useSupabaseClient()
const profile = useState('user-profile')

async function logout() {
  await supabase.auth.signOut()
  profile.value = null
  await navigateTo('/login')
}
```

---

## Fase 5 - User Management via Google Apps Script

Semua operasi privileged user dijalankan di GAS dengan `secret key` atau legacy `service_role key`.

### 5.1 - Simpan secrets di GAS Properties

Google Apps Script Editor -> Project Settings -> Script Properties:

```txt
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxx
APP_URL=https://domain-produksi-kamu.com
```

Jika masih memakai legacy key:

```txt
SUPABASE_PUBLISHABLE_KEY=legacy-anon-key
SUPABASE_SECRET_KEY=legacy-service-role-key
```

### 5.2 - Helper header Supabase di GAS

```js
function getSupabaseProps() {
  const props = PropertiesService.getScriptProperties()

  return {
    supabaseUrl: props.getProperty('SUPABASE_URL'),
    publishableKey: props.getProperty('SUPABASE_PUBLISHABLE_KEY'),
    secretKey: props.getProperty('SUPABASE_SECRET_KEY'),
    appUrl: props.getProperty('APP_URL')
  }
}

function userHeaders(token) {
  const { publishableKey } = getSupabaseProps()

  return {
    apikey: publishableKey,
    Authorization: `Bearer ${token}`
  }
}

function adminHeaders() {
  const { secretKey } = getSupabaseProps()
  const headers = { apikey: secretKey }

  // Legacy service_role key adalah JWT dan masih memakai Authorization Bearer.
  // New sb_secret_* key tidak perlu dijadikan Bearer token.
  if (!String(secretKey).startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${secretKey}`
  }

  return headers
}

function fetchJson(url, options) {
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    ...options
  })

  const status = response.getResponseCode()
  const text = response.getContentText()
  let json = null

  if (text) {
    try {
      json = JSON.parse(text)
    } catch (error) {
      json = { message: text }
    }
  }

  if (status < 200 || status >= 300) {
    throw new Error(json && json.message ? json.message : `Supabase error ${status}`)
  }

  return json
}
```

### 5.3 - Validasi token di setiap request GAS

Setiap request dari Nuxt mengirim Supabase `access_token`. GAS memvalidasi token dan memastikan caller adalah admin aktif.

```js
function validateAdminRequest(body) {
  const token = body.token
  if (!token) throw new Error('Token tidak ditemukan.')

  const { supabaseUrl } = getSupabaseProps()

  const userData = fetchJson(`${supabaseUrl}/auth/v1/user`, {
    method: 'get',
    headers: userHeaders(token)
  })

  if (!userData.id) throw new Error('Token tidak valid.')

  const profiles = fetchJson(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userData.id)}&select=role,is_active`,
    {
      method: 'get',
      headers: userHeaders(token)
    }
  )

  const profile = profiles[0]

  if (!profile) throw new Error('Profile tidak ditemukan.')
  if (profile.role !== 'admin') throw new Error('Unauthorized: bukan admin.')
  if (!profile.is_active) throw new Error('Unauthorized: akun tidak aktif.')

  return { userId: userData.id, role: profile.role }
}
```

### 5.4 - Tambahkan action ke `doPost()`

```js
function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}')
  const action = body.action

  try {
    switch (action) {
      case 'adminUsersList': return adminUsersList(body)
      case 'adminUsersInvite': return adminUsersInvite(body)
      case 'adminUsersUpdate': return adminUsersUpdate(body)
      case 'adminUsersDeactivate': return adminUsersDeactivate(body)
      case 'adminUsersReactivate': return adminUsersReactivate(body)
      default:
        return jsonResponse({ success: false, error: 'Action tidak dikenal.' })
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
```

### 5.5 - `adminUsersList`

```js
function adminUsersList(body) {
  validateAdminRequest(body)

  const { supabaseUrl } = getSupabaseProps()
  const data = fetchJson(
    `${supabaseUrl}/rest/v1/profiles?select=id,email,full_name,role,is_active,created_at&order=created_at.desc`,
    {
      method: 'get',
      headers: adminHeaders()
    }
  )

  return jsonResponse({ success: true, data })
}
```

### 5.6 - `adminUsersInvite`

Gunakan `/auth/v1/invite`. Jangan gunakan `/auth/v1/admin/users` untuk flow invite email.

```js
function adminUsersInvite(body) {
  validateAdminRequest(body)

  const { email, full_name, role } = body
  if (!email || !role) throw new Error('Email dan role wajib diisi.')
  if (!['admin', 'management', 'qrcc'].includes(role)) throw new Error('Role tidak valid.')

  const { supabaseUrl, appUrl } = getSupabaseProps()
  const redirectTo = `${appUrl}/confirm`

  const newUser = fetchJson(
    `${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: adminHeaders(),
      payload: JSON.stringify({
        email,
        data: { full_name, role }
      })
    }
  )

  return jsonResponse({
    success: true,
    data: { id: newUser.id, email: newUser.email || email }
  })
}
```

### 5.7 - `adminUsersUpdate`

```js
function adminUsersUpdate(body) {
  validateAdminRequest(body)

  const { targetUserId, full_name, role } = body
  if (!targetUserId) throw new Error('targetUserId wajib diisi.')
  if (role && !['admin', 'management', 'qrcc'].includes(role)) throw new Error('Role tidak valid.')

  const { supabaseUrl } = getSupabaseProps()

  if (role && role !== 'admin') {
    const admins = fetchJson(
      `${supabaseUrl}/rest/v1/profiles?role=eq.admin&is_active=eq.true&select=id`,
      {
        method: 'get',
        headers: adminHeaders()
      }
    )

    const isLastAdmin = admins.length === 1 && admins[0].id === targetUserId
    if (isLastAdmin) throw new Error('Tidak boleh downgrade admin terakhir.')
  }

  const patch = {}
  if (full_name !== undefined) patch.full_name = full_name
  if (role !== undefined) patch.role = role

  fetchJson(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      ...adminHeaders(),
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify(patch)
  })

  return jsonResponse({ success: true })
}
```

### 5.8 - `adminUsersDeactivate`

```js
function adminUsersDeactivate(body) {
  const caller = validateAdminRequest(body)

  const { targetUserId } = body
  if (!targetUserId) throw new Error('targetUserId wajib diisi.')

  const { supabaseUrl } = getSupabaseProps()

  const admins = fetchJson(
    `${supabaseUrl}/rest/v1/profiles?role=eq.admin&is_active=eq.true&select=id`,
    {
      method: 'get',
      headers: adminHeaders()
    }
  )

  const isLastAdmin = admins.length === 1 && admins[0].id === targetUserId
  if (isLastAdmin) throw new Error('Tidak boleh menonaktifkan admin terakhir.')

  fetchJson(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      ...adminHeaders(),
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify({ is_active: false })
  })

  return jsonResponse({ success: true, data: { deactivatedBy: caller.userId } })
}
```

### 5.9 - `adminUsersReactivate`

```js
function adminUsersReactivate(body) {
  validateAdminRequest(body)

  const { targetUserId } = body
  if (!targetUserId) throw new Error('targetUserId wajib diisi.')

  const { supabaseUrl } = getSupabaseProps()

  fetchJson(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      ...adminHeaders(),
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify({ is_active: true })
  })

  return jsonResponse({ success: true })
}
```

### 5.10 - Nuxt composable untuk admin API

Buat `app/composables/useAdminApi.ts`, atau update `app/composables/useAppsScriptApi.ts` agar tidak lagi memakai `sessionStorage.getItem('admin_token')`.

```ts
export function useAdminApi() {
  const supabase = useSupabaseClient()
  const runtimeConfig = useRuntimeConfig()
  const gasUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

  async function callAdminAction<T>(
    action: string,
    payload: Record<string, unknown> = {}
  ) {
    if (!gasUrl.value) throw new Error('URL Google Apps Script belum dikonfigurasi.')

    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('Tidak ada session aktif.')

    const response = await fetch(gasUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        token: data.session.access_token,
        ...payload
      })
    })

    if (!response.ok) {
      throw new Error(`Google Apps Script merespons ${response.status}.`)
    }

    const result = await response.json() as {
      success: boolean
      data?: T
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Request gagal.')
    }

    return result.data as T
  }

  return { callAdminAction }
}
```

### 5.11 - Halaman user management

File sudah ada di repo:

```txt
app/pages/dashboard/settings/members.vue
```

Pastikan halaman ini memakai:

```ts
definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})
```

Semua operasi list/invite/update/deactivate/reactivate harus memakai `useAdminApi()`.

---

## Fase 6 - Row Level Security (RLS), Grants, dan Policies

RLS melindungi database jika UI atau middleware dibypass.

### 6.1 - Grants dasar

Supabase Data API tetap membutuhkan privileges Postgres. Jalankan grants eksplisit agar tidak bergantung pada default project.

```sql
grant usage on schema public to authenticated;

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from authenticated;

revoke all on public.pengajuan from anon;
grant select, insert, update, delete on public.pengajuan to authenticated;
```

### 6.2 - Helper role check anti-recursion

Jangan membuat policy `profiles` yang membaca `profiles` langsung dari policy yang sama. Itu bisa memicu infinite recursion.

```sql
create or replace function public.current_user_has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = any(allowed_roles)
  );
$$;

revoke execute on function public.current_user_has_role(text[]) from public;
grant execute on function public.current_user_has_role(text[]) to authenticated;
```

### 6.3 - RLS untuk `profiles`

Untuk MVP ini, client hanya perlu membaca profile sendiri. User management dilakukan via GAS secret key.

```sql
alter table public.profiles enable row level security;

drop policy if exists "profiles read own profile" on public.profiles;
create policy "profiles read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);
```

Jika nanti admin perlu membaca semua profiles langsung dari client, tambahkan policy select admin. Untuk MVP ini tidak perlu karena list member lewat GAS.

### 6.4 - RLS untuk `pengajuan`

```sql
alter table public.pengajuan enable row level security;

drop policy if exists "dashboard roles can select pengajuan" on public.pengajuan;
create policy "dashboard roles can select pengajuan"
  on public.pengajuan
  for select
  to authenticated
  using (public.current_user_has_role(array['admin', 'management', 'qrcc']));

drop policy if exists "admin and qrcc can insert pengajuan" on public.pengajuan;
create policy "admin and qrcc can insert pengajuan"
  on public.pengajuan
  for insert
  to authenticated
  with check (public.current_user_has_role(array['admin', 'qrcc']));

drop policy if exists "admin and qrcc can update pengajuan" on public.pengajuan;
create policy "admin and qrcc can update pengajuan"
  on public.pengajuan
  for update
  to authenticated
  using (public.current_user_has_role(array['admin', 'qrcc']))
  with check (public.current_user_has_role(array['admin', 'qrcc']));

drop policy if exists "admin can delete pengajuan" on public.pengajuan;
create policy "admin can delete pengajuan"
  on public.pengajuan
  for delete
  to authenticated
  using (public.current_user_has_role(array['admin']));
```

---

## Fase 7 - UI Authorization

UI menyesuaikan role, tetapi bukan satu-satunya lapisan keamanan.

### 7.1 - Hide/show menu berdasarkan role

Di sidebar/navbar dashboard:

```vue
<script setup lang="ts">
const { isAdmin, isQrcc } = useUserProfile()
</script>

<template>
  <nav>
    <NuxtLink to="/dashboard">Dashboard</NuxtLink>
    <NuxtLink to="/dashboard/pengajuan">Pengajuan</NuxtLink>

    <NuxtLink v-if="isAdmin || isQrcc" to="/dashboard/settings">
      Settings
    </NuxtLink>

    <NuxtLink v-if="isAdmin" to="/dashboard/settings/members">
      Members
    </NuxtLink>
  </nav>
</template>
```

### 7.2 - Hide tombol action untuk management

Di halaman detail pengajuan:

```vue
<script setup lang="ts">
const { isManagement } = useUserProfile()
</script>

<template>
  <div v-if="!isManagement">
    <UButton label="Update Status" />
    <UButton label="Edit Catatan" />
  </div>
</template>
```

---

## Fase 8 - Halaman `/403`

Buat file `app/pages/403.vue`.

```vue
<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
    <h1 class="text-4xl font-bold">403</h1>
    <p class="text-muted">Kamu tidak punya akses ke halaman ini.</p>
    <UButton label="Kembali ke Dashboard" to="/dashboard" color="neutral" variant="soft" />
  </div>
</template>
```

Pastikan `/403` ada di `routeRules` dan `redirectOptions.exclude`.

---

## Fase 9 - Testing & Security Checklist

### Auth & Session

- [ ] Login email + password berhasil.
- [ ] Login dengan kredensial salah ditolak.
- [ ] User invite bisa membuka `/confirm`.
- [ ] User invite bisa set password di `/confirm`.
- [ ] User invite bisa login setelah set password.
- [ ] Logout menghapus session dan redirect ke `/login`.
- [ ] Akses `/dashboard` tanpa login redirect ke `/login`.
- [ ] Setelah login, akses `/login` redirect ke `/dashboard`.

### Role Guard

- [ ] Admin bisa akses semua `/dashboard/**`.
- [ ] Management hanya bisa akses `/dashboard` dan `/dashboard/pengajuan/**`.
- [ ] Management yang memaksa akses `/dashboard/settings` diarahkan ke `/403`.
- [ ] QRCC bisa akses semua dashboard kecuali `/dashboard/settings/members`.
- [ ] QRCC yang memaksa akses `/dashboard/settings/members` diarahkan ke `/403`.

### Inactive User

- [ ] User `is_active = false` tidak bisa akses dashboard.
- [ ] User `is_active = false` diarahkan ke `/403`.

### User Management

- [ ] Hanya admin yang bisa membuka `/dashboard/settings/members`.
- [ ] Admin bisa invite user baru.
- [ ] Email invite terkirim dari Supabase.
- [ ] Admin bisa ubah `full_name`.
- [ ] Admin bisa ubah `role`.
- [ ] Admin bisa deactivate user.
- [ ] Admin bisa reactivate user.
- [ ] Admin tidak bisa deactivate admin terakhir.
- [ ] Admin tidak bisa downgrade admin terakhir.
- [ ] Non-admin yang memanggil GAS action admin mendapat error unauthorized.

### RLS

- [ ] User bisa membaca profile sendiri.
- [ ] User non-admin tidak bisa update `profiles` via Supabase client.
- [ ] Management bisa select `pengajuan`.
- [ ] Management tidak bisa insert/update/delete `pengajuan`.
- [ ] QRCC bisa insert/update `pengajuan`.
- [ ] QRCC tidak bisa delete `pengajuan`.
- [ ] Admin bisa delete `pengajuan`.
- [ ] User tanpa profile/role valid ditolak RLS.

### Security Keys

- [ ] `secret key` atau `service_role key` tidak ada di `.env` Nuxt.
- [ ] `secret key` atau `service_role key` tidak ada di `nuxt.config.ts`.
- [ ] `secret key` atau `service_role key` tidak ada di output `pnpm generate`.
- [ ] `secret key` atau `service_role key` hanya ada di GAS Script Properties.
- [ ] GAS URL tidak pernah mengembalikan secret key di response.

---

## Catatan Deployment Static-Only

Build:

```bash
pnpm generate
```

Output `dist/` atau `.output/public/` bisa di-host di static hosting selama SPA fallback aktif.

Contoh Cloudflare Pages `_redirects`:

```txt
/*  /index.html  200
```

Karena route guard berjalan di client untuk target static-only, jangan mengandalkan middleware Nuxt sebagai satu-satunya keamanan. Data sensitif tetap harus dilindungi oleh RLS dan operasi privileged tetap harus lewat GAS atau backend tepercaya lain.
