<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNovelStore } from '../../stores/novel'

const route = useRoute()
const novelStore = useNovelStore()
const collapsed = ref(false)

onMounted(() => novelStore.loadNovels())

const navItems = [
  { path: '/',              label: '首页',      icon: 'home' },
  { path: '/chapters',      label: '章节',      icon: 'doc' },
  { path: '/agent/chat',    label: 'AI 聊天',   icon: 'chat' },
  { path: '/characters',    label: '角色',      icon: 'user' },
  { path: '/foreshadowing', label: '伏笔',      icon: 'hook' },
  { path: '/outline',       label: '大纲',      icon: 'list' },
  { path: '/plotlines',     label: '情节线',    icon: 'flow' },
  { path: '/search',        label: '搜索',      icon: 'search' },
  { path: '/stats',         label: '统计',      icon: 'chart' },
  { path: '/settings',      label: '设置',      icon: 'gear' },
]

function isActive(path: string) { return path === '/' ? route.path === '/' : route.path.startsWith(path) }

const icons: Record<string, string> = {
  home:   '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  doc:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
  chat:   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  user:   '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  hook:   '<polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>',
  list:   '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>',
  flow:   '<polyline points="9 18 15 12 9 6"></polyline>',
  search:'<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  chart:  '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
  gear:   '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
}
</script>

<template>
  <aside :class="collapsed ? 'w-[54px]' : 'w-[190px]'" class="flex flex-col bg-[#f8f8f8] border-r border-[#e8e8e8] shrink-0 transition-[width] duration-150">
    <!-- Header -->
    <div class="flex items-center h-11 px-3 border-b border-[#e8e8e8]">
      <button @click="collapsed = !collapsed" class="w-7 h-7 flex items-center justify-center rounded hover:bg-black/[0.04] text-[#888] transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.3"/><line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
      <span v-if="!collapsed" class="ml-2 text-[13px] font-semibold text-[#333] tracking-tight">Novel Studio</span>
    </div>

    <!-- Novel Selector -->
    <div v-if="!collapsed" class="px-2 py-2 border-b border-[#e8e8e8]">
      <select v-model="novelStore.currentNovelId" @change="novelStore.switchNovel(novelStore.currentNovelId)"
        class="w-full text-[12px] px-2 py-1.5 rounded border border-[#e0e0e0] bg-white text-[#555] outline-none cursor-pointer">
        <option v-for="n in novelStore.novels" :key="n.id" :value="n.id">{{ n.title }}</option>
      </select>
    </div>

    <!-- Nav -->
    <nav class="flex-1 py-1.5 overflow-y-auto space-y-0.5">
      <template v-for="item in navItems" :key="item.path">
        <router-link :to="item.path" class="flex items-center h-9 mx-1.5 px-2 rounded-md transition-colors text-[13px] group"
          :class="isActive(item.path) ? 'bg-black/[0.06] text-[#1a1a1a]' : 'text-[#777] hover:bg-black/[0.02] hover:text-[#444]'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" v-html="icons[item.icon]" />
          <span v-if="!collapsed" class="ml-2.5 truncate">{{ item.label }}</span>
        </router-link>
      </template>
    </nav>
  </aside>
</template>
