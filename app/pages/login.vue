<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()

definePageMeta({
  layout: 'cs'
})

const glassCardClass = 'group flex cursor-pointer flex-col items-start justify-between rounded-3xl border border-white/60 bg-white/45 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-2xl hover:border-white/80 hover:bg-white/65 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)]'

const schema = z.object({
  username: z.string('Username is required').min(3, 'Must be at least 3 characters'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  username: undefined,
  password: undefined
})

const show = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}
</script>

<template>
  <section class="mx-auto my-auto flex w-full max-w-6xl flex-col items-center justify-center py-10 md:py-0">
    <main :class="glassCardClass" class="w-full max-w-sm">
      <!-- Glassmorphism Login Card -->
      <div class="glass-panel rounded-[2.5rem] p-6 w-full relative overflow-hidden">
        <!-- Decorative accent inside card -->
        <div
          class="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-blue-200/50 to-transparent rounded-full blur-2xl"/>

        <!-- Header Text -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-navy-900 mb-1">Selamat Datang 👋</h2>
          <p class="text-sm text-slate-500">Silakan masuk ke akun Anda untuk melanjutkan.</p>
        </div>

        <!-- Login Form -->
        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="Username" name="username" size="lg">
            <UInput v-model="state.username" class="w-full" />
          </UFormField>

          <UFormField label="Password" name="password" size="lg">
            <UInput v-model="state.password" :type="show ? 'text' : 'password'" :ui="{ trailing: 'pe-1' }" class="w-full"> 
              <template #trailing>
                <UButton
color="neutral" variant="link" size="sm" :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="show ? 'Hide password' : 'Show password'" :aria-pressed="show" aria-controls="password"
                  @click="show = !show" />
              </template>
            </UInput>
          </UFormField>

          <UButton type="submit" size="xl" class="w-full mt-4 justify-center text-sm" trailing-icon="i-lucide-arrow-right">
            Masuk Sekarang
          </UButton>
        </UForm>

        <!-- Footer Text -->
        <p class="text-center text-sm text-slate-500 mt-8">
          Belum punya akun?
          <a
href="#"
            class="font-bold text-navy-900 hover:underline underline-offset-4 decoration-2 decoration-navy-400/30">Hubungi
            Admin</a>
        </p>
      </div>
    </main>
  </section>
</template>