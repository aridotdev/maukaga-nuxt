<script setup>
import { CalendarDate } from '@internationalized/date'

const toast = useToast()
const inputDate = useTemplateRef('inputDate')

const formState = reactive({
  namaPemohon: '',
  bagianCabang: '',
  namaPemilikBarang: '',
  tanggalForm: new CalendarDate(2026, 5, 29),
  alasanPengajuan: '',
  catatanTambahan: '',
  products: [
    { model: '', namaProduk: '', nomorSeri: '' },
    { model: '', namaProduk: '', nomorSeri: '' }
  ]
})

function showToast(title, color = 'info', description) {
  toast.add({
    title,
    description,
    color
  })
}

function onDraftSubmit() {
  showToast('Draft berhasil dibuat!', 'success', 'ID Pengajuan: KG-20260528-0001')
}
</script>

<template>
  <div class="relative mx-auto flex w-full max-w-350 flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <!-- Header Section -->
    <header class="flex flex-col items-start justify-between gap-3 rounded-2xl border border-muted bg-default/45 p-4 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:p-5">
      <div class="min-w-0 flex-1">
        <h1 class="mb-1 text-xl font-bold text-highlighted lg:text-2xl">
          Form Pengajuan Kartu Garansi Baru
        </h1>
        <p class="max-w-none truncate text-xs leading-relaxed text-muted lg:text-sm">
          Lengkapi data pengajuan, cetak hard copy, lalu unggah kembali dokumen bertanda tangan untuk finalisasi.
        </p>
      </div>
    </header>

    <!-- Main Content Layout (Left Form, Right Sidebar) -->
    <div class="flex flex-col gap-6 lg:flex-row">
      <!-- Left Column: Form Areas -->
      <UForm
        :state="formState"
        class="flex flex-1 flex-col gap-6"
        @submit="onDraftSubmit"
      >
        <!-- Section 1: Informasi Pemohon -->
        <section class="relative rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl lg:p-8">
          <div class="mb-8 flex items-center justify-between border-b border-muted pb-4">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-muted bg-default/60 text-highlighted shadow-sm">
                <UIcon name="i-lucide-user" class="size-5" />
              </div>
              <div>
                <p class="mb-1 text-xs font-bold uppercase tracking-wider text-dimmed">
                  Langkah 01
                </p>
                <h2 class="text-xl font-bold text-highlighted">
                  Informasi Pemohon
                </h2>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <UFormField name="namaPemohon" label="Nama Pemohon" size="lg">
              <UInput
                v-model="formState.namaPemohon"
                placeholder="Masukkan nama Anda"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField name="bagianCabang" label="Bagian/Cabang" size="lg">
              <UInput
                v-model="formState.bagianCabang"
                placeholder="Contoh: Cabang Jakarta Pusat"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField name="namaPemilikBarang" label="Nama Pemilik Barang" size="lg">
              <UInput
                v-model="formState.namaPemilikBarang"
                placeholder="Masukkan nama pemilik barang"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField name="tanggalForm" label="Tanggal Form" size="lg">
              <UInputDate
                ref="inputDate"
                v-model="formState.tanggalForm"
                class="w-full"
                size="lg"
              >
                <template #trailing>
                  <UPopover :reference="inputDate?.inputsRef[3]?.$el">
                    <UButton
                      color="neutral"
                      variant="link"
                      size="sm"
                      icon="i-lucide-calendar"
                      aria-label="Pilih tanggal"
                      class="px-0"
                    />

                    <template #content>
                      <UCalendar v-model="formState.tanggalForm" class="p-2" />
                    </template>
                  </UPopover>
                </template>
              </UInputDate>
            </UFormField>

            <UFormField name="alasanPengajuan" label="Alasan Pengajuan" size="lg">
              <UTextarea
                v-model="formState.alasanPengajuan"
                placeholder="Jelaskan alasan pengajuan kartu garansi baru"
                class="w-full"
                size="lg"
                :rows="5"
              />
            </UFormField>

            <UFormField name="catatanTambahan" label="Catatan Tambahan" hint="Opsional" size="lg">
              <UTextarea
                v-model="formState.catatanTambahan"
                placeholder="Tambahkan catatan jika ada"
                class="w-full"
                size="lg"
                :rows="5"
              />
            </UFormField>
          </div>
        </section>

        <!-- Section 2: Daftar Produk -->
        <section class="flex flex-col rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl lg:p-8">
          <div class="mb-6 flex items-center justify-between border-b border-muted pb-4">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-muted bg-default/60 text-highlighted shadow-sm">
                <UIcon name="i-lucide-package" class="size-5" />
              </div>
              <div>
                <p class="mb-1 text-xs font-bold uppercase tracking-wider text-dimmed">
                  Langkah 02
                </p>
                <h2 class="text-xl font-bold text-highlighted">
                  Daftar Produk
                </h2>
              </div>
            </div>
            <UButton
              type="button"
              label="Tambah Item"
              icon="i-lucide-plus"
              color="neutral"
              variant="subtle"
              @click="showToast('Tambah item belum tersedia pada prototipe ini.')"
            />
          </div>

          <!-- Item List -->
          <div class="mb-8 flex flex-col gap-4">
            <div
              v-for="(product, index) in formState.products"
              :key="index"
              class="relative rounded-2xl border border-muted border-l-4 border-l-primary bg-default/35 p-5 shadow-sm backdrop-blur-lg transition-colors hover:bg-default/50"
            >
              <div class="mb-4 flex items-start justify-between">
                <div>
                  <span class="mb-1 block text-xs font-semibold uppercase tracking-wider text-dimmed">Item {{ index + 1 }}</span>
                  <h3 class="text-base font-bold text-highlighted">
                    Detail Produk
                  </h3>
                </div>
                <UButton
                  type="button"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  :aria-label="`Hapus item ${index + 1}`"
                />
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <UFormField :name="`products.${index}.model`" label="Model" size="sm">
                  <UInput
                    v-model="product.model"
                    placeholder="Model Produk"
                    class="w-full"
                    color="neutral"
                    variant="soft"
                    size="md"
                  />
                </UFormField>

                <UFormField :name="`products.${index}.namaProduk`" label="Nama Produk" size="sm">
                  <UInput
                    v-model="product.namaProduk"
                    placeholder="Nama Produk Lengkap"
                    class="w-full"
                    color="neutral"
                    variant="soft"
                    size="md"
                  />
                </UFormField>

                <UFormField :name="`products.${index}.nomorSeri`" label="Nomor Seri" size="sm">
                  <UInput
                    v-model="product.nomorSeri"
                    placeholder="Nomor Seri / S/N"
                    class="w-full"
                    color="neutral"
                    variant="soft"
                    size="md"
                  />
                </UFormField>
              </div>
            </div>
          </div>

          <!-- Footer Action in Form Area -->
          <div class="mt-auto flex flex-col items-center justify-between gap-4 border-t border-muted pt-6 sm:flex-row">
            <p class="text-xs italic text-muted">
              Draft akan tersimpan secara berkala.
            </p>
            <UButton
              type="submit"
              label="Simpan Draft & Cetak"
              icon="i-lucide-printer"
              color="primary"
              size="lg"
              class="w-full justify-center sm:w-auto"
            />
          </div>
        </section>
      </UForm>

      <!-- Right Column: Sidebar / Status Tracker -->
      <aside class="flex w-full flex-col gap-6 lg:w-80">
        <!-- Status Tracker Panel -->
        <div class="rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl">
          <div class="mb-6 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-muted bg-default/60 text-highlighted shadow-sm">
              <UIcon name="i-lucide-file-text" class="size-5" />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-dimmed">
                Alur Berkas
              </p>
              <h3 class="text-base font-bold text-highlighted">
                Proses Pengajuan
              </h3>
            </div>
          </div>

          <div class="relative flex flex-col gap-3">
            <!-- Connecting Line -->
            <div class="absolute bottom-8 left-5.5 top-8 z-0 w-0.5 border-l border-muted bg-muted" />

            <!-- Step 1: Active -->
            <div class="relative z-10 flex gap-4 rounded-2xl border border-inverted bg-inverted p-4 text-inverted shadow-sm">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-default/30 bg-default/20 text-sm font-bold backdrop-blur-sm">
                01
              </div>
              <div>
                <h4 class="mb-1 text-sm font-bold text-inverted">
                  Lengkapi data
                </h4>
                <p class="text-xs leading-relaxed text-inverted/80">
                  Isi data pemohon, alasan, dan daftar produk secara detail.
                </p>
              </div>
            </div>

            <!-- Step 2: Next (Inactive but styled) -->
            <div class="relative z-10 flex gap-4 rounded-2xl border border-muted bg-default/40 p-4 shadow-sm backdrop-blur-sm transition-colors hover:bg-default/60">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-muted bg-default text-sm font-bold text-highlighted shadow-sm">
                02
              </div>
              <div>
                <h4 class="mb-1 text-sm font-bold text-highlighted">
                  Cetak draft
                </h4>
                <p class="text-xs leading-relaxed text-muted">
                  Simpan draft, cetak form fisik, lalu minta tanda tangan basah.
                </p>
              </div>
            </div>

            <!-- Step 3: Pending -->
            <div class="relative z-10 flex gap-4 rounded-2xl border border-dashed border-muted bg-muted/20 p-4 opacity-70 backdrop-blur-sm">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-dimmed">
                03
              </div>
              <div>
                <h4 class="mb-1 text-sm font-bold text-toned">
                  Upload final
                </h4>
                <p class="text-xs leading-relaxed text-dimmed">
                  Unggah scan atau foto hard copy yang sudah lengkap &amp; ditandatangani.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Snippet -->
        <div class="flex flex-col justify-center rounded-4xl border border-muted bg-default/45 p-6 shadow-sm backdrop-blur-xl">
          <p class="mb-1 text-xs font-bold uppercase tracking-wider text-dimmed">
            Referensi Draft
          </p>
          <p class="flex items-center gap-2 text-base font-bold text-highlighted">
            <UIcon name="i-lucide-circle-alert" class="size-5 text-warning" />
            Belum diterbitkan
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
