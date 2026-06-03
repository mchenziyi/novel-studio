<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NConfigProvider } from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'
</script>

<template>
  <NConfigProvider>
    <NMessageProvider>
      <NDialogProvider>
        <div class="flex h-screen bg-[#fafafa] text-[#1a1a1a] antialiased">
          <AppSidebar />
          <main class="flex-1 overflow-auto min-w-0">
            <router-view />
          </main>
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
