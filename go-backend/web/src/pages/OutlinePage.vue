<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const content = ref('')
const loading = ref(true)
const saved = ref(false)

onMounted(async () => {
  try {
    const data = await api.outline.get(novelStore.currentNovelId)
    content.value = data.content || ''
  } catch (_) {}
  loading.value = false
})

async function save() {
  await api.outline.update({ novelId: novelStore.currentNovelId, content: content.value, id: 'outline-' + novelStore.currentNovelId })
  saved.value = true
  setTimeout(() => saved.value = false, 2000)
}
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-[#1a1a1a]">大纲</h1>
      <NButton size="small" type="primary" @click="save">{{ saved ? '已保存' : '保存' }}</NButton>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
    </div>

    <textarea v-else v-model="content"
      class="w-full min-h-[600px] p-4 border border-[#e5e5e5] rounded-lg text-sm leading-7 font-serif text-[#1a1a1a] resize-none outline-none focus:border-[#999]"
      placeholder="开始写大纲..." />
  </div>
</template>
