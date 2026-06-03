<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const stats = ref<any>({})
const loading = ref(true)

onMounted(async () => {
  try { stats.value = await api.stats.get(novelStore.currentNovelId) } catch (_) {}
  loading.value = false
})
</script>

<template>
  <div class="p-8 max-w-[900px] mx-auto">
    <h1 class="text-lg font-semibold text-[#1a1a1a] mb-6 tracking-tight">仪表盘</h1>

    <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
    <template v-else>
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg border border-[#e5e5e5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.6" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="text-xs text-[#999]">章节</span>
          </div>
          <div class="text-2xl font-bold text-[#1a1a1a]">{{ stats.totalChapters || 0 }}</div>
        </div>
        <div class="bg-white rounded-lg border border-[#e5e5e5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.6" stroke-linecap="round"><polyline points="4 7 12 3 20 7"/><polyline points="4 17 12 13 20 17"/><line x1="4" y1="7" x2="4" y2="17"/><line x1="20" y1="7" x2="20" y2="17"/><line x1="12" y1="13" x2="12" y2="21"/></svg>
            <span class="text-xs text-[#999]">总字数</span>
          </div>
          <div class="text-2xl font-bold text-[#1a1a1a]">{{ ((stats.totalWords || 0) / 10000).toFixed(1) }}<span class="text-sm font-normal text-[#999] ml-0.5">万</span></div>
        </div>
        <div class="bg-white rounded-lg border border-[#e5e5e5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.6" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span class="text-xs text-[#999]">角色</span>
          </div>
          <div class="text-2xl font-bold text-[#1a1a1a]">{{ stats.characterCount || 0 }}</div>
        </div>
        <div class="bg-white rounded-lg border border-[#e5e5e5] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.6" stroke-linecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <span class="text-xs text-[#999]">伏笔</span>
          </div>
          <div class="text-2xl font-bold text-[#1a1a1a]">{{ stats.hookCount || 0 }}</div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
        <div class="px-5 py-2.5 border-b border-[#eee] text-xs font-medium text-[#666]">最近更新</div>
        <div v-if="stats.recentChapters?.length" class="divide-y divide-[#f5f5f5]">
          <div v-for="ch in stats.recentChapters" :key="ch.id" class="px-5 py-2.5 flex items-center gap-4 text-[13px] hover:bg-[#fafafa] cursor-pointer transition-colors" @click="$router.push(`/chapters/${ch.id}`)">
            <span class="text-[#999] font-mono text-xs w-11 shrink-0">{{ ch.id }}</span>
            <span class="flex-1 text-[#333] truncate">{{ ch.title }}</span>
            <span class="text-[#aaa] text-xs shrink-0">{{ ch.words }}字</span>
            <span class="text-[#bbb] text-xs shrink-0 w-20 text-right">{{ ch.updated?.slice(0,10) }}</span>
          </div>
        </div>
        <div v-else class="px-5 py-10 text-center text-xs text-[#bbb]">暂无章节</div>
      </div>
    </template>
  </div>
</template>
