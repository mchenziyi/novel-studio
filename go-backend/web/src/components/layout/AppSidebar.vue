<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const collapsed = ref(false)

const navItems = [
  { path: '/',              icon: '🏠', label: '首页' },
  { path: '/chapters',      icon: '📄', label: '章节' },
  { path: '/agent/chat',    icon: '💬', label: 'AI 聊天' },
  { path: '/characters',    icon: '👤', label: '角色' },
  { path: '/foreshadowing', icon: '🪝', label: '伏笔' },
  { path: '/outline',       icon: '📋', label: '大纲' },
  { path: '/plotlines',     icon: '📈', label: '情节线' },
  { path: '/search',        icon: '🔍', label: '搜索' },
  { path: '/stats',         icon: '📊', label: '统计' },
  { path: '/settings',      icon: '⚙',  label: '设置' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside :class="collapsed ? 'w-[56px]' : 'w-[200px]'" class="flex flex-col bg-[#f5f5f5] border-r border-[#e5e5e5] shrink-0">
    <div class="flex items-center h-12 px-3 border-b border-[#e5e5e5]">
      <button @click="collapsed = !collapsed" class="text-lg text-[#666]">☰</button>
      <span v-if="!collapsed" class="ml-2 text-sm font-medium text-[#1a1a1a]">Novel Studio</span>
    </div>
    <nav class="flex-1 py-2 overflow-y-auto">
      <div v-for="item in navItems" :key="item.path">
        <router-link :to="item.path" class="flex items-center h-10 px-3 text-sm"
          :class="isActive(item.path) ? 'bg-black/5 text-[#1a1a1a] font-medium' : 'text-[#666] hover:bg-black/[0.03]'">
          <span class="w-8 text-center">{{ item.icon }}</span>
          <span v-if="!collapsed" class="ml-1">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>
