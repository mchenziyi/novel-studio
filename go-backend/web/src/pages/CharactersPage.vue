<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NModal, NInput, NSelect } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const chars = ref<any[]>([])
const loading = ref(true)
const editing = ref<any>(null)

const roles = [
  { label: '主角', value: 'protagonist' },
  { label: '反派', value: 'antagonist' },
  { label: '配角', value: 'supporting' },
]

onMounted(async () => {
  try { chars.value = await api.characters.list(novelStore.currentNovelId) } catch (_) {}
  loading.value = false
})

async function save() {
  if (!editing.value) return
  const data = { ...editing.value, novelId: novelStore.currentNovelId }
  if (data.id) await api.characters.update(data.id, data)
  else await api.characters.create(data)
  editing.value = null
  try { chars.value = await api.characters.list(novelStore.currentNovelId) } catch (_) {}
}
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-[#1a1a1a]">角色</h1>
      <NButton size="small" @click="editing = { name: '', role: 'supporting' }">+ 添加</NButton>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
    </div>
    <div v-else-if="chars.length === 0" class="text-center py-20 text-[#999] text-sm">暂无角色</div>
    <div v-else class="bg-white rounded-lg border border-[#e5e5e5] divide-y divide-[#e5e5e5]">
      <div v-for="c in chars" :key="c.id" class="px-5 py-3 flex items-center gap-4 text-sm hover:bg-[#fafafa] cursor-pointer"
        @click="editing = { ...c }">
        <span class="font-medium text-[#1a1a1a]">{{ c.name }}</span>
        <span class="text-[#999] text-xs px-1.5 py-0.5 rounded border border-[#e5e5e5]">{{ c.role }}</span>
        <span class="flex-1 text-[#666] truncate">{{ c.description }}</span>
      </div>
    </div>

    <NModal v-if="editing" :show="true" :on-update:show="() => editing = null">
      <div class="bg-white rounded-lg p-6 w-[480px]">
        <h3 class="text-lg font-medium mb-4">{{ editing.id ? '编辑' : '添加' }}角色</h3>
        <NInput v-model:value="editing.name" placeholder="角色名" class="mb-3" />
        <NSelect v-model:value="editing.role" :options="roles" class="mb-3" />
        <NInput v-model:value="editing.description" type="textarea" placeholder="描述..." :autosize="{ minRows: 3 }" />
        <div class="flex justify-end gap-2 mt-4">
          <NButton @click="editing = null">取消</NButton>
          <NButton type="primary" @click="save">保存</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>
