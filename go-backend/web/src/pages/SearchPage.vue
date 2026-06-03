<script setup lang="ts">
import { ref } from 'vue'
import { NInput } from 'naive-ui'
import { useRouter } from 'vue-router'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const router = useRouter()
const novelStore = useNovelStore()
const query = ref('')
const results = ref<any[]>([])
const searched = ref(false)

async function search() {
  if (!query.value.trim()) return
  searched.value = true
  try { results.value = await api.search.search(novelStore.currentNovelId, query.value) } catch (_) {}
}
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <h1 class="text-xl font-semibold text-[#1a1a1a] mb-6">搜索</h1>
    <NInput v-model:value="query" placeholder="搜索章节内容..." size="large" @keydown.enter="search" />

    <div v-if="!searched" class="text-center py-20 text-[#999] text-sm">输入关键词搜索章节内容</div>
    <div v-else-if="results.length === 0" class="text-center py-20 text-[#999] text-sm">无结果</div>
    <div v-else class="mt-4 bg-white rounded-lg border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
      <div v-for="r in results" :key="r.id" class="px-5 py-3 text-sm hover:bg-[#fafafa] cursor-pointer"
        @click="router.push(`/chapters/${r.id}`)">
        <span class="font-medium text-[#1a1a1a]">{{ r.id }} · {{ r.title }}</span>
        <div class="text-[#666] mt-1 truncate font-mono text-xs">{{ r.snippet }}</div>
      </div>
    </div>
  </div>
</template>
