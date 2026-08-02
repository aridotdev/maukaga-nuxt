# Rencana Implementasi: Penyederhanaan Flow Status Pengajuan

## Ringkasan Eksekutif

Dua penyederhanaan sekaligus dalam satu rencana:

1. **Hapus status `Selesai` dari level item** — status item cukup `Baru → Disetujui / Ditolak`.
2. **Hapus status `Diterima` dari lifecycle pengajuan** — gabungkan maknanya ke dalam `Selesai`.

Lifecycle pengajuan yang disederhanakan menjadi:

```
Sebelum: Baru → Disetujui → Diprint → Dikirim → Diterima → Selesai
Sesudah: Baru → Disetujui → Diprint → Dikirim → Selesai
```

---

## Bagian 1 — Hapus `Selesai` dari Status Item

### Diagnosis

- Status item `Selesai` tidak memiliki efek hilir (*downstream*) — tidak mengubah status pengajuan induk secara otomatis, tidak mempengaruhi antrean cetak, tidak memicu notifikasi apapun.
- Admin harus menekan tombol **"Tandai Selesai"** satu per satu untuk tiap item, lalu masih harus mengubah status pengajuan induknya secara terpisah. Dua operasi yang menyampaikan informasi yang sama persis.
- UI form item menjadi membingungkan: dua tombol aksi dengan aturan `disabled` berbeda.

### Solusi

Hapus `Selesai` dari `ItemApprovalStatus`. Status item hanya mencerminkan keputusan approval: `Baru`, `Disetujui`, `Ditolak`. Konsep "completion" item ditunjukkan cukup lewat status pengajuan induknya yang sudah `Selesai`.

---

## Bagian 2 — Hapus Status `Diterima` dari Lifecycle Pengajuan

### Diagnosis

`Diterima` adalah *dead-step* — langkah manual murni yang tidak memiliki efek otomatis apapun:

| Cek | Hasil |
|---|---|
| Ada otomasi yang mengisi status `Diterima`? | ❌ Tidak. `syncPengajuanLifecycleFromWarranty_` hanya push ke `Diprint` dan `Dikirim`, tidak pernah ke `Diterima`. |
| Ada otomasi yang terpicu *dari* status `Diterima`? | ❌ Tidak. `Diterima` tidak mengaktifkan notifikasi, email, atau trigger apapun. |
| Ada logika bisnis yang bergantung pada `Diterima`? | ❌ Tidak. Satu-satunya fungsinya adalah sebagai "pintu gerbang" sebelum `Selesai`. |
| Apakah `Diterima` → `Selesai` otomatis? | ❌ Tidak. Keduanya manual. |

Pada praktiknya, Admin/QRCC harus melakukan **dua klik manual berturut-turut** tanpa ada peristiwa sistem di antara keduanya: ubah ke `Diterima`, lalu ubah lagi ke `Selesai`. Ini adalah overhead tanpa nilai tambah.

### Solusi

**Gabungkan `Diterima` ke dalam `Selesai`.** Status `Selesai` kini bermakna "kartu garansi sudah diterima dan proses selesai secara keseluruhan." Transisi normal yang baru: `Dikirim → Selesai` (langsung, satu langkah).

---

## Scope Perubahan Lengkap

### `doc/Code.gs` (Backend Apps Script)

**Konstanta:**
```
// VALID_STATUSES — hapus 'Diterima'
const VALID_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Selesai'];

// LIFECYCLE_ORDER — hapus 'Diterima'
const LIFECYCLE_ORDER = ['Baru', 'Disetujui', 'Diprint', 'Dikirim', 'Selesai'];

// ITEM_APPROVAL_STATUSES — hapus 'Selesai'
const ITEM_APPROVAL_STATUSES = ['Baru', 'Disetujui', 'Ditolak'];
```

**`handleUpdateItemStatus()` — hapus semua cabang `Selesai` item:**
- Sederhanakan guard: `if (!hasDecisionPayload) throw new Error('Keputusan item wajib diisi')`.
- Hapus variabel `isCompletingItem` dan seluruh percabangan `if (isCompletingItem)`.
- Hapus guard `statusLama === 'Selesai' && hasDecisionPayload`.

**`assertStatusTransitionAllowed_()` — update guard `Selesai`:**
```javascript
// Sebelum: Selesai hanya valid setelah Diterima
if (statusBaru === 'Selesai' && statusLama !== 'Diterima') { ... }

// Sesudah: Selesai hanya valid setelah Dikirim
if (statusBaru === 'Selesai' && statusLama !== 'Dikirim') {
  if (session.role !== 'admin') throw new Error('Status Selesai hanya bisa dipilih setelah Dikirim');
  if (!note) throw new Error('Catatan Admin wajib diisi jika status Selesai dipilih bukan dari Dikirim');
}
```
- Hapus seluruh blok guard `Diterima` (baris 1207–1209).

**`derivePengajuanLifecycleFromFulfillment_()` — update freeze-list:**
```javascript
// Sebelum
if (['Ditolak', 'Diterima', 'Selesai'].indexOf(current) !== -1) return current;

// Sesudah
if (['Ditolak', 'Selesai'].indexOf(current) !== -1) return current;
```

**`handleGetDashboard()` — hapus field `diterima` dari summary object.**

**`deriveItemStatusFromDecision_()` — hapus baris:**
```javascript
// Hapus:
if (cleanStatus === 'Selesai' && cleanDecision === 'Disetujui') return 'Selesai';
```

**`inferItemDecisionForBackfill_()` — hapus `'Selesai'` dari array:**
```javascript
// Sebelum
if (status === 'Disetujui' || status === 'Selesai') return 'Disetujui';
if (['Disetujui', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'].indexOf(parent) !== -1) return 'Disetujui';

// Sesudah
if (status === 'Disetujui') return 'Disetujui';
if (['Disetujui', 'Diprint', 'Dikirim', 'Selesai'].indexOf(parent) !== -1) return 'Disetujui';
```

---

### `app/composables/usePengajuanDetail.ts`

```typescript
// Sebelum
export type PengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Diterima' | 'Selesai'
export type ItemApprovalStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Selesai'

// Sesudah
export type PengajuanStatus = 'Baru' | 'Disetujui' | 'Ditolak' | 'Diprint' | 'Dikirim' | 'Selesai'
export type ItemApprovalStatus = 'Baru' | 'Disetujui' | 'Ditolak'
```

- Hapus fungsi `completeItem()` (beserta export-nya di return object).

---

### `app/pages/dashboard/pengajuan/[idPengajuan].vue`

**Konstanta:**
```typescript
// Sebelum
const PENGAJUAN_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'] as const
const LIFECYCLE_ORDER = ['Baru', 'Disetujui', 'Diprint', 'Dikirim', 'Diterima', 'Selesai'] as const
const PENGAJUAN_STATUS_COLORS = { ..., Diterima: 'secondary', ... }

// Sesudah
const PENGAJUAN_STATUSES = ['Baru', 'Disetujui', 'Ditolak', 'Diprint', 'Dikirim', 'Selesai'] as const
const LIFECYCLE_ORDER = ['Baru', 'Disetujui', 'Diprint', 'Dikirim', 'Selesai'] as const
const PENGAJUAN_STATUS_COLORS = { ... } // hapus key Diterima
```

**Update `requiresPengajuanStatusNote()`:**
```typescript
// Hapus kondisi Diterima — karena Diterima tidak ada lagi
// Tambahkan kondisi Selesai dari selain Dikirim (menggantikan peran Diterima)
function requiresPengajuanStatusNote(currentStatus: string, nextStatus: string) {
  return nextStatus === 'Ditolak'
    || isBackwardPengajuanTransition(currentStatus, nextStatus)
    || (nextStatus === 'Selesai' && currentStatus !== 'Dikirim') // baru
}
```

**Update `getPengajuanTransitionConfirmMessage()`:**
```typescript
// Hapus baris: if (nextStatus === 'Diterima') return '...'
// Update pesan Selesai (sekarang langsung dari Dikirim):
if (nextStatus === 'Selesai') return 'Tandai kartu garansi sudah diterima dan proses selesai?'
```

- Hapus `ITEM_APPROVAL_STATUSES` punya `'Selesai'` di constant list.
- Hapus fungsi `submitCompleteItem()`, `saveCompleteItem()`.
- Hapus field `isCompleting` dari type `ItemDecisionForm`.
- Hapus tombol **"Tandai Selesai"** dari template.
- Bersihkan `:disabled` pada tombol "Simpan Keputusan" (hapus `|| getItemForm(item).isCompleting`).

---

### `app/pages/dashboard/pengajuan/index.vue`

- Hapus `Diterima` dari type `DashboardStatus`.
- Hapus entry `Diterima` dari `STATUS_COLORS` map.
- Hapus entry `Diterima` dari dropdown filter status (jika ada).

---

### `app/components/home/HomePengajuan.vue`

- Hapus `Diterima` dari type `DashboardStatus`.
- Hapus entry `Diterima` dari `STATUS_COLORS` map.

---

### `app/composables/useDashboardData.ts`

- Hapus `'Diterima'` dari type `DashboardStatus`.
- Hapus `'Diterima'` dari `VALID_STATUSES` set.
- Hapus field `diterima?: number` dari type `DashboardSummary`.

---

### `app/pages/check-status.vue` (Halaman Publik)

- Hapus entry `Diterima` dari `statusCheckBadge()` map.
- Hapus entry `Diterima: '...'` dari `pengajuanStatusInfoTextMap()`.
- Entry `Selesai` diperbarui copynya: `'Kartu garansi sudah diterima dan proses selesai.'` (menggabungkan makna lama `Diterima` + `Selesai`).

---

## Migrasi Data (Google Sheets)

Ada dua kategori data lama yang perlu dimigrasi:

| Kondisi Data Lama | Aksi Migrasi |
|---|---|
| `ITEMS.Status Item = Selesai` | Update ke `Disetujui` (pre-condition lama sudah menjamin item ini memang disetujui) |
| `PENGAJUAN.Status = Diterima` | Update ke `Selesai` (secara semantis setara — kartu sudah diterima, proses tinggal ditutup) |

**Strategi:** Buat satu fungsi migrasi satu kali pakai di `Code.gs`: `migrateStatusSimplification()`. Jalankan dari Apps Script editor **sebelum** deploy kode baru. Fungsi ini bisa didokumentasikan dan diarchive setelah dijalankan.

---

## Urutan Implementasi

1. **Tulis fungsi `migrateStatusSimplification()`** di `Code.gs` — jangan jalankan dulu.
2. **Update semua logika backend** di `Code.gs`:
   - Konstanta `VALID_STATUSES`, `LIFECYCLE_ORDER`, `ITEM_APPROVAL_STATUSES`.
   - `handleUpdateItemStatus`, `assertStatusTransitionAllowed_`, `derivePengajuanLifecycleFromFulfillment_`.
   - Helper `deriveItemStatusFromDecision_`, `inferItemDecisionForBackfill_`.
3. **Update semua composable & type frontend:**
   - `usePengajuanDetail.ts` — hapus `completeItem`, update types.
   - `useDashboardData.ts` — hapus `Diterima`.
4. **Update semua halaman & komponen:**
   - `[idPengajuan].vue` — hapus tombol + fungsi + konstanta terkait.
   - `index.vue`, `HomePengajuan.vue` — hapus `Diterima` dari map dan type.
   - `check-status.vue` — hapus `Diterima`, update copy `Selesai`.
5. **Deploy `Code.gs`** ke Apps Script.
6. **Jalankan `migrateStatusSimplification()`** dari Apps Script editor.
7. **Deploy frontend Nuxt.**
8. **Verifikasi akhir** — cek pengajuan lama yang dulunya `Diterima` sekarang muncul sebagai `Selesai`, dan pengajuan yang baru masuk tidak bisa lagi memilih `Diterima`.

---

## Dampak & Risiko

| Aspek | Status | Catatan |
|---|---|---|
| Antrean cetak kartu garansi | ✅ Tidak berubah | Auto-lifecycle hanya menyentuh `Diprint`/`Dikirim` |
| Email digest | ✅ Tidak berubah | Tidak ada logika digest untuk `Diterima` |
| Cek status publik (halaman CS) | ⚠️ Minor | Hanya update copy teks `Selesai` |
| Dashboard summary | ⚠️ Minor | Hapus kolom counter `diterima` |
| Data PENGAJUAN lama dengan Status `Diterima` | ⚠️ Migrasi | Satu kali, reversible, aman |
| Data ITEMS lama dengan Status `Selesai` | ⚠️ Migrasi | Satu kali, reversible, aman |
| API `updateStatus` (pengajuan) | ✅ Tetap ada | Guard `Selesai` diperbarui: valid dari `Dikirim` |
| API `updateItemStatus` | ✅ Tetap ada | Lebih sederhana — satu mode saja |

---

## Hasil Akhir

### Lifecycle Status Pengajuan (Sesudah)

```
Baru → Disetujui → Diprint → Dikirim → Selesai
         ↘ Ditolak (terminal)
```

Lifecycle auto-otomatis dari sistem (WarrantyCards sync):
```
Disetujui → [auto] Diprint → [auto] Dikirim
```

Tindakan manual Admin/QRCC yang tersisa:
```
1. Review item → pilih Disetujui / Ditolak → Simpan
2. (setelah kartu dikirim dan diterima) → ubah pengajuan → Selesai
```

**Dari 7 status menjadi 6, dari 2 tindakan manual akhir menjadi 1.**

### Perbandingan Beban Kerja Admin (per pengajuan)

| | Sebelum | Sesudah |
|---|---|---|
| Aksi per item | 2 (Simpan Keputusan + Tandai Selesai) | 1 (Simpan Keputusan) |
| Aksi akhir pengajuan | 2 (ubah ke Diterima → ubah ke Selesai) | 1 (ubah ke Selesai) |
| Total klik (contoh 3 item) | 2×3 + 2 = **8 klik** | 1×3 + 1 = **4 klik** |
