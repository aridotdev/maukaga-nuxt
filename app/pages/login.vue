<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const router = useRouter()

definePageMeta({
  layout: 'cs'
})

const glassCardClass = 'group flex cursor-pointer flex-col items-start justify-between rounded-3xl border border-white/60 bg-white/45 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl hover:border-white/80 hover:bg-white/65 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)]'

const schema = z.object({
  username: z.string('Username wajib diisi').min(1, 'Username wajib diisi'),
  password: z.string('Password wajib diisi').min(1, 'Password wajib diisi')
})

type Schema = z.output<typeof schema>
type ApiResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type LoginResponse = {
  token: string
  nama: string
  username: string
}

const state = reactive<Partial<Schema>>({
  username: '',
  password: ''
})

const show = ref(false)
const isLoading = ref(false)
const appsScriptApiUrl = computed(() => String(runtimeConfig.public.appsScriptApiUrl || ''))

onMounted(() => {
  if (sessionStorage.getItem('admin_token')) {
    router.replace('/dashboard')
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isLoading.value = true

  try {
    const result = await callAPI<LoginResponse>('adminLogin', {
      username: event.data.username,
      password: event.data.password
    })

    if (!result.success || !result.data?.token) {
      throw new Error(result.error || 'Login gagal')
    }

    sessionStorage.setItem('admin_token', result.data.token)
    sessionStorage.setItem('admin_nama', result.data.nama || 'Admin')
    sessionStorage.setItem('admin_username', result.data.username || event.data.username)

    toast.add({
      title: 'Login berhasil',
      color: 'success',
      icon: 'i-lucide-circle-check'
    })

    await router.push('/dashboard')
  } catch (error) {
    toast.add({
      title: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isLoading.value = false
  }
}

async function callAPI<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  if (!appsScriptApiUrl.value) {
    throw new Error('URL Google Apps Script belum dikonfigurasi.')
  }

  const response = await fetch(appsScriptApiUrl.value, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  })

  if (!response.ok) {
    throw new Error(`Google Apps Script merespons ${response.status}.`)
  }

  return response.json() as Promise<ApiResult<T>>
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <section class="mx-auto my-auto flex w-full max-w-6xl flex-col items-center justify-center py-10 md:py-0">
    <main :class="glassCardClass" class="w-full max-w-sm">
      <div class="glass-panel relative w-full overflow-hidden rounded-3xl p-6">
        <div class="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-linear-to-br from-blue-200/50 to-transparent blur-2xl" />

        <div class="mb-8">
          <h2 class="mb-1 text-2xl font-bold text-navy-900">
            Selamat Datang 👋
          </h2>
          <p class="text-sm text-slate-500">
            Silakan masuk ke akun Anda untuk melanjutkan.
          </p>
        </div>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            label="Username"
            name="username"
            size="lg"
          >
            <UInput
              v-model="state.username"
              class="w-full"
              autocomplete="username"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            size="lg"
          >
            <UInput
              v-model="state.password"
              :type="show ? 'text' : 'password'"
              :ui="{ trailing: 'pe-1' }"
              class="w-full"
              autocomplete="current-password"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="show ? 'Hide password' : 'Show password'"
                  :aria-pressed="show"
                  aria-controls="password"
                  @click="show = !show"
                />
              </template>
            </UInput>
          </UFormField>

          <UButton
            type="submit"
            size="xl"
            class="mt-4 w-full justify-center text-sm"
            trailing-icon="i-lucide-arrow-right"
            :loading="isLoading"
            :disabled="isLoading"
          >
            Masuk Sekarang
          </UButton>
        </UForm>

        <p class="mt-8 text-center text-sm text-slate-500">
          Belum punya akun?
          <a
            href="#"
            class="font-bold text-navy-900 underline-offset-4 decoration-2 decoration-navy-400/30 hover:underline"
          >
            Hubungi Admin
          </a>
        </p>
      </div>
    </main>
  </section>
</template>
