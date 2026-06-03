<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NButton } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const router = useRouter()
const novelStore = useNovelStore()
const chapters = ref<any[]>([])
const search = ref('')
const loading = ref(true)
const reverse = ref(true)

onMounted(async () => {
  try { chapters.value = await api.chapters.list(novelStore.currentNovelId) } catch (_) {}
  loading.value = false
})

const sorted = computed(() => {
  const list = [...chapters.value]
  if (reverse.value) list.reverse()
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter((c: any) => c.title?.toLowerCase().includes(q) || c.id?.includes(q))
})
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-[#1a1a1a]">章节</h1>
      <NButton size="small" @click="router.push('/chapters/0000')">+ 新建</NButton>
    </div>

    <div class="flex gap-2 mb-4">
      <NInput v-model:value="search" placeholder="搜索章节..." class="flex-1" clearable size="small" />
      <NButton size="small" :type="reverse ? 'primary' : 'default'" @click="reverse = !reverse">
        {{ reverse ? '↓ 倒序' : '↑ 正序' }}
      </NButton>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
    </div>

    <div v-else-if="sorted.length === 0" class="text-center py-20 text-[#999] text-sm">
      {{ chapters.length === 0 ? '还没有章节' : '没有匹配的章节' }}
    </div>

    <div v-else class="bg-white rounded-lg border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
      <div v-for="ch in sorted" :key="ch.id"
        class="px-5 py-3 flex items-center gap-4 text-sm hover:bg-[#fafafa] cursor-pointer"
        @click="router.push(`/chapters/${ch.id}`)"
      >
        <span class="text-[#666] font-mono w-12 shrink-0">{{ ch.id }}</span>
        <span class="flex-1 text-[#1a1a1a] truncate">{{ ch.title }}</span>
        <span class="text-[#999] shrink-0">{{ ch.wordCount }}字</span>
      </div>
    </div>
  </div>
</template>
