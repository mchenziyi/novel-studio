<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NButton, NPopconfirm, NTag, NPagination } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const router = useRouter()
const novelStore = useNovelStore()
const chapters = ref<any[]>([])
const search = ref('')
const loading = ref(true)
const reverse = ref(true)
const page = ref(1)
const pageSize = 20

onMounted(async () => {
  try { chapters.value = await api.chapters.list(novelStore.currentNovelId) } catch (_) {}
  loading.value = false
})

const sorted = computed(() => {
  let list = [...chapters.value]
  if (reverse.value) list.reverse()
  if (search.value) { const q = search.value.toLowerCase(); list = list.filter((c: any) => c.title?.toLowerCase().includes(q) || c.id?.includes(q)) }
  return list
})

const paged = computed(() => sorted.value.slice((page.value - 1) * pageSize, page.value * pageSize))

async function deleteCh(id: string) {
  try { await api.chapters.delete(id); chapters.value = chapters.value.filter((c: any) => c.id !== id) } catch (_) {}
}

const statusLabel: Record<string, string> = { synced: '已同步', pending: '待处理', audit: '审计中' }
</script>

<template>
  <div class="p-8 max-w-[900px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-lg font-semibold text-[#1a1a1a] tracking-tight">章节</h1>
      <NButton size="small" @click="router.push('/chapters/0000')">+ 新建</NButton>
    </div>

    <div class="flex gap-2 mb-4">
      <NInput v-model:value="search" placeholder="搜索章节..." class="flex-1" clearable size="small" />
      <NButton size="small" :type="reverse ? 'primary' : 'default'" @click="reverse = !reverse">{{ reverse ? '↓ 倒序' : '↑ 正序' }}</NButton>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
    <div v-else-if="sorted.length === 0" class="text-center py-20">
      <div class="text-3xl mb-3">📖</div>
      <div class="text-sm text-[#666] mb-1">还没有章节</div>
      <div class="text-xs text-[#999] mb-3">点击右上角按钮新建你的第一章</div>
      <NButton size="small" @click="router.push('/chapters/0000')">新建章节</NButton>
    </div>
    <div v-else>
      <div class="bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden">
        <div class="divide-y divide-[#f5f5f5]">
          <div v-for="ch in paged" :key="ch.id" class="px-5 py-3 flex items-center gap-3 text-[13px] hover:bg-[#fafafa] cursor-pointer group transition-colors" @click="router.push(`/chapters/${ch.id}`)">
            <span class="text-[#999] font-mono text-xs w-11 shrink-0">{{ ch.id }}</span>
            <span class="flex-1 text-[#333] truncate">{{ ch.title }}</span>
            <NTag size="tiny" :type="ch.status==='synced'?'success':ch.status==='audit'?'warning':'default'" :bordered="false">{{ statusLabel[ch.status] || ch.status }}</NTag>
            <span class="text-[#aaa] text-xs shrink-0">{{ ch.wordCount }}字</span>
            <NPopconfirm @positive-click="()=>deleteCh(ch.id)"><template #trigger><button class="opacity-0 group-hover:opacity-100 text-[#ccc] hover:text-red-500 transition-all text-xs shrink-0 ml-1">✕</button></template>确定删除？</NPopconfirm>
          </div>
        </div>
      </div>
      <div class="flex justify-center mt-4" v-if="sorted.length > pageSize">
        <NPagination v-model:page="page" :page-count="Math.ceil(sorted.length / pageSize)" size="small" />
      </div>
    </div>
  </div>
</template>
