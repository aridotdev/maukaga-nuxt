<script setup lang="ts">
const { label: appVersionLabel, title: appVersionTitle } = useAppBuildInfo()

defineOptions({
  name: 'AdminIndexPage'
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-default px-6 py-12">
    <section class="flex w-full max-w-md flex-col items-center gap-4 text-center">
      <div class="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-lucide-shield-check" class="size-6" />
      </div>
      <h1 class="text-2xl font-bold text-highlighted">
        Admin Web
      </h1>
      <p class="text-sm text-muted">
        Skeleton admin terpisah untuk fase berikutnya.
      </p>
      <p class="rounded-md border border-muted bg-muted/30 px-2 py-1 font-mono text-xs text-muted" :title="appVersionTitle">
        v{{ appVersionLabel }}
      </p>
    </section>
  </main>
</template>
