<script setup lang="ts">
import { NMessageProvider, NDialogProvider, NConfigProvider } from 'naive-ui'
import AppSidebar from './components/layout/AppSidebar.vue'

const themeOverrides = {
  common: {
    primaryColor: '#171717',
    primaryColorHover: '#333333',
    primaryColorPressed: '#000000',
    bodyColor: '#fafafa',
    borderRadius: '6px',
  }
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <div class="flex h-screen bg-[#fafafa]">
          <AppSidebar />
          <main class="flex-1 overflow-auto">
            <router-view />
          </main>
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
