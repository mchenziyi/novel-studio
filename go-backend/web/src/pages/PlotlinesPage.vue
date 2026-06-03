<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NModal, NInput } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const items = ref<any[]>([])
const loading = ref(true)
const editing = ref<any>(null)

onMounted(load)
async function load() {
  try { items.value = await api.plotlines.list(novelStore.currentNovelId) } catch (_) {}
  loading.value = false
}
async function save() {
  if (!editing.value) return
  const data = { ...editing.value, novelId: novelStore.currentNovelId }
  if (data.id) await api.plotlines.update(data.id, data)
  else await api.plotlines.create(data)
  editing.value = null; load()
}
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-[#1a1a1a]">情节线</h1>
      <NButton size="small" @click="editing = { name: '', status: 'active' }">+ 添加</NButton>
    </div>
    <div v-if="loading" class="flex justify-center py-10"><div class="w-8 h-8 animate-spin border-2 border-[#d4d4d4] border-t-[#171717] rounded-full" /></div>
    <div v-else-if="items.length === 0" class="text-center py-20 text-[#999] text-sm">暂无情节线</div>
    <div v-else class="bg-white rounded-lg border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
      <div v-for="p in items" :key="p.id" class="px-5 py-3 text-sm hover:bg-[#fafafa] cursor-pointer" @click="editing = { ...p }">
        <span class="font-medium text-[#1a1a1a]">{{ p.name }}</span>
        <span class="ml-2 text-xs text-[#999]">{{ p.status }}</span>
        <span v-if="p.startChapter" class="ml-4 text-[#666]">第{{ p.startChapter }}-{{ p.endChapter || '?' }}章</span>
        <div class="text-[#666] mt-0.5 truncate" v-if="p.description">{{ p.description }}</div>
      </div>
    </div>
    <NModal v-if="editing" :show="true" :on-update:show="() => editing = null">
      <div class="bg-white rounded-lg p-6 w-[480px]">
        <h3 class="text-lg font-medium mb-4">{{ editing.id ? '编辑' : '添加' }}情节线</h3>
        <NInput v-model:value="editing.name" placeholder="名称" class="mb-3" />
        <NInput v-model:value="editing.description" type="textarea" placeholder="描述..." :autosize="{ minRows: 2 }" class="mb-3" />
        <NInput v-model:value="editing.startChapter" placeholder="起始章节" class="mb-3" />
        <NInput v-model:value="editing.endChapter" placeholder="结束章节" class="mb-3" />
        <div class="flex justify-end gap-2 mt-4">
          <NButton @click="editing = null">取消</NButton>
          <NButton type="primary" @click="save">保存</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>
