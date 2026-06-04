<script setup lang="ts">
import { sub } from 'date-fns'
import HomePengajuan from '~/components/home/HomePengajuan.vue'
import type { Period, Range } from '~/types'

const { isNotificationsSlideoverOpen } = useDashboard()

definePageMeta({
  middleware: ['auth-guard', 'role-guard']
})

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <HomeStats />
      <div class="flex gap-6 max-w-full">
        <HomeChart :period="period" :range="range" class="flex-1" />
        <HomeReviewProductName />
      </div>
      <HomePengajuan />
    </template>
  </UDashboardPanel>
</template>
