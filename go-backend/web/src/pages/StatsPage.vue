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
  <div class="p-6 max-w-[900px] mx-auto">
    <h1 class="text-xl font-semibold text-[#1a1a1a] mb-6">统计</h1>
    <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 animate-spin border-2 border-[#d4d4d4] border-t-[#171717] rounded-full" /></div>
    <div v-else>
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg border p-5"><div class="text-3xl font-bold">{{ stats.totalChapters || 0 }}</div><div class="text-sm text-[#666] mt-1">章节</div></div>
        <div class="bg-white rounded-lg border p-5"><div class="text-3xl font-bold">{{ ((stats.totalWords || 0) / 10000).toFixed(1) }}万</div><div class="text-sm text-[#666] mt-1">总字数</div></div>
        <div class="bg-white rounded-lg border p-5"><div class="text-3xl font-bold">{{ stats.characterCount || 0 }}</div><div class="text-sm text-[#666] mt-1">角色</div></div>
        <div class="bg-white rounded-lg border p-5"><div class="text-3xl font-bold">{{ stats.hookCount || 0 }}</div><div class="text-sm text-[#666] mt-1">伏笔</div></div>
      </div>
      <div class="bg-white rounded-lg border">
        <div class="px-5 py-3 border-b text-sm font-medium">最近更新</div>
        <div v-if="stats.recentChapters?.length" class="divide-y">
          <div v-for="ch in stats.recentChapters" :key="ch.id" class="px-5 py-3 flex items-center gap-4 text-sm">
            <span class="text-[#666] font-mono w-12">{{ ch.id }}</span>
            <span class="flex-1">{{ ch.title }}</span>
            <span class="text-[#999]">{{ ch.words }}字</span>
            <span class="text-[#999] text-xs">{{ ch.updated?.slice(0,10) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
