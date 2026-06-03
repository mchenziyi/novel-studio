<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NModal, NInput, NSelect, NTag } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const items = ref<any[]>([])
const loading = ref(true)
const filter = ref('all')
const editing = ref<any>(null)

const statusOpts = [
  { label: '已埋', value: 'planted' }, { label: '推进中', value: 'progressing' }, { label: '已解', value: 'resolved' },
]

onMounted(load)
async function load() {
  try { items.value = await api.foreshadowing.list(novelStore.currentNovelId, filter.value) } catch (_) {}
  loading.value = false
}

async function save() {
  if (!editing.value) return
  const data = { ...editing.value, novelId: novelStore.currentNovelId }
  if (data.id) await api.foreshadowing.update(data.id, data)
  else await api.foreshadowing.create(data)
  editing.value = null; load()
}

function statusLabel(s: string) {
  return s === 'planted' ? '已埋' : s === 'progressing' ? '推进中' : '已解'
}
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-semibold text-[#1a1a1a]">伏笔</h1>
      <NButton size="small" @click="editing = { name: '', status: 'planted' }">+ 添加</NButton>
    </div>

    <div class="flex gap-2 mb-4">
      <NButton v-for="s in [{ label: '全部', value: 'all' }, ...statusOpts]" :key="s.value"
        size="tiny" :type="filter === s.value ? 'primary' : 'default'"
        @click="filter = s.value; load()">{{ s.label }}</NButton>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><div class="w-8 h-8 animate-spin border-2 border-[#d4d4d4] border-t-[#171717] rounded-full" /></div>
    <div v-else-if="items.length === 0" class="text-center py-20 text-[#999] text-sm">暂无伏笔</div>
    <div v-else class="bg-white rounded-lg border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
      <div v-for="f in items" :key="f.id" class="px-5 py-3 text-sm hover:bg-[#fafafa] cursor-pointer" @click="editing = { ...f }">
        <div class="font-medium text-[#1a1a1a]">{{ f.name }}</div>
        <div class="text-[#666] mt-0.5 truncate">{{ f.description }}</div>
        <div class="mt-1 flex gap-2">
          <NTag size="tiny">{{ statusLabel(f.status) }}</NTag>
          <span v-if="f.plantedChapter" class="text-xs text-[#999]">第{{ f.plantedChapter }}章</span>
        </div>
      </div>
    </div>

    <NModal v-if="editing" :show="true" :on-update:show="() => editing = null">
      <div class="bg-white rounded-lg p-6 w-[480px]">
        <h3 class="text-lg font-medium mb-4">{{ editing.id ? '编辑' : '添加' }}伏笔</h3>
        <NInput v-model:value="editing.name" placeholder="名称" class="mb-3" />
        <NInput v-model:value="editing.description" type="textarea" placeholder="描述..." :autosize="{ minRows: 2 }" class="mb-3" />
        <NSelect v-model:value="editing.status" :options="statusOpts" class="mb-3" />
        <NInput v-model:value="editing.plantedChapter" placeholder="章节号" class="mb-3" />
        <div class="flex justify-end gap-2 mt-4">
          <NButton @click="editing = null">取消</NButton>
          <NButton type="primary" @click="save">保存</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>
