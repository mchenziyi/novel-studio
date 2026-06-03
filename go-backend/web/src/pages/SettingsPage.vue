<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NInput, NTabs, NTabPane, NTag, NPopconfirm, NModal } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const models = ref<any[]>([])
const styles = ref<any[]>([])
const configs = ref<Record<string, string>>({})
const loading = ref(true)
const tab = ref('models')

// Model config
const editingModel = ref<any>(null)
const fetchingModels = ref(false)
const fetchedModels = ref<string[]>([])

onMounted(async () => {
  try {
    const [m, s, c] = await Promise.all([
      api.models.list(), api.style.list(novelStore.currentNovelId), api.novels.config(novelStore.currentNovelId)
    ])
    models.value = m; styles.value = s; configs.value = c || {}
  } catch (_) {}
  loading.value = false
})

async function saveModel() {
  if (!editingModel.value) return
  if (editingModel.value.id) await api.models.update(editingModel.value.id, editingModel.value)
  else await api.models.create(editingModel.value)
  editingModel.value = null
  try { models.value = await api.models.list() } catch (_) {}
}

async function deleteModel(id: string) {
  await api.models.delete(id)
  try { models.value = await api.models.list() } catch (_) {}
}

async function fetchModelList() {
  if (!editingModel.value) return
  fetchingModels.value = true
  try {
    const data = await api.models.fetchList(
      editingModel.value.provider,
      editingModel.value.settings?.apiKey || '',
      editingModel.value.settings?.baseURL
    )
    fetchedModels.value = data.models || []
  } catch (_) {}
  fetchingModels.value = false
}

async function activateStyle(data: any) {
  await api.style.activate(data.id)
  try { styles.value = await api.style.list(novelStore.currentNovelId) } catch (_) {}
}

async function deleteStyle(id: number) {
  await api.style.delete(id)
  try { styles.value = await api.style.list(novelStore.currentNovelId) } catch (_) {}
}

async function saveConfig() {
  await api.novels.updateConfig(novelStore.currentNovelId, configs.value)
}
</script>

<template>
  <div class="p-6 max-w-[900px] mx-auto">
    <h1 class="text-xl font-semibold text-[#1a1a1a] mb-6">设置</h1>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
    </div>

    <NTabs v-else v-model:value="tab">
      <NTabPane name="models" tab="模型配置">
        <div class="space-y-3 mt-4">
          <NButton size="small" @click="editingModel = { name: '', provider: 'custom', enabled: true, settings: '{}' }">+ 添加模型</NButton>
          <div v-for="m in models" :key="m.id" class="bg-white border border-[#e5e5e5] rounded-lg p-4 text-sm">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-[#1a1a1a]">{{ m.name }}</span>
                <NTag size="tiny" class="ml-2">{{ m.provider }}</NTag>
                <NTag v-if="m.isDefault" size="tiny" type="info" class="ml-1">默认</NTag>
              </div>
              <div class="flex gap-2">
                <NButton size="tiny" @click="editingModel = { ...m, settings: JSON.stringify(typeof m.settings === 'string' ? JSON.parse(m.settings) : m.settings) }">编辑</NButton>
                <NPopconfirm @positive-click="() => deleteModel(m.id)"><template #trigger><NButton size="tiny" type="error" ghost>删除</NButton></template>确定删除？</NPopconfirm>
              </div>
            </div>
          </div>
        </div>

        <NModal v-if="editingModel" :show="true" :on-update:show="() => editingModel = null">
          <div class="bg-white rounded-lg p-6 w-[520px]">
            <h3 class="text-lg font-medium mb-4">{{ editingModel.id ? '编辑' : '添加' }}模型</h3>
            <NInput v-model:value="editingModel.name" placeholder="名称" class="mb-3" />
            <NInput v-model:value="editingModel.provider" placeholder="Provider (deepseek/openai/gemini/custom)" class="mb-3" />
            <NInput v-model:value="editingModel.settings" type="textarea" placeholder="Settings JSON..." :autosize="{ minRows: 3 }" class="mb-3" />
            <div class="flex gap-2">
              <NButton size="small" @click="fetchModelList" :loading="fetchingModels">拉取可用模型</NButton>
            </div>
            <div v-if="fetchedModels.length" class="mt-2 text-xs text-[#666] space-x-1">
              <NTag v-for="fm in fetchedModels" :key="fm" size="tiny">{{ fm }}</NTag>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <NButton @click="editingModel = null">取消</NButton>
              <NButton type="primary" @click="saveModel">保存</NButton>
            </div>
          </div>
        </NModal>
      </NTabPane>

      <NTabPane name="style" tab="文风管理">
        <div class="mt-4 space-y-3">
          <div v-if="styles.length === 0" class="text-center py-10 text-[#999] text-sm">暂无文风配置</div>
          <div v-for="s in styles" :key="s.id" class="bg-white border border-[#e5e5e5] rounded-lg p-4 text-sm">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium text-[#1a1a1a]">{{ s.name }}</span>
                <NTag v-if="s.isActive" size="tiny" type="success" class="ml-2">激活</NTag>
              </div>
              <div class="flex gap-2">
                <NButton size="tiny" @click="activateStyle(s)" v-if="!s.isActive">激活</NButton>
                <NPopconfirm @positive-click="() => deleteStyle(s.id)"><template #trigger><NButton size="tiny" type="error" ghost>删除</NButton></template>确定删除？</NPopconfirm>
              </div>
            </div>
          </div>
        </div>
      </NTabPane>

      <NTabPane name="config" tab="写作规范">
        <div class="mt-4 space-y-4 max-w-[400px]">
          <div>
            <label class="text-sm text-[#666] block mb-1">目标总字数</label>
            <NInput v-model:value="configs.targetTotalWords" placeholder="如 300000" />
          </div>
          <div>
            <label class="text-sm text-[#666] block mb-1">每章最少字数</label>
            <NInput v-model:value="configs.minWordsPerChapter" placeholder="如 2000" />
          </div>
          <div>
            <label class="text-sm text-[#666] block mb-1">每章最多字数</label>
            <NInput v-model:value="configs.maxWordsPerChapter" placeholder="如 5000" />
          </div>
          <div>
            <label class="text-sm text-[#666] block mb-1">文风规则（逗号分隔）</label>
            <NInput v-model:value="configs.writingStyleRules" type="textarea" placeholder="如 多用短句,白描为主" :autosize="{ minRows: 2 }" />
          </div>
          <div>
            <label class="text-sm text-[#666] block mb-1">禁止写法（逗号分隔）</label>
            <NInput v-model:value="configs.forbiddenPatterns" type="textarea" placeholder="如 忽然,突然,猛然" :autosize="{ minRows: 2 }" />
          </div>
          <div>
            <label class="text-sm text-[#666] block mb-1">核心设定（逗号分隔）</label>
            <NInput v-model:value="configs.coreSettings" type="textarea" placeholder="如 主角名周醒,世界背景xxx" :autosize="{ minRows: 2 }" />
          </div>
          <NButton type="primary" @click="saveConfig">保存配置</NButton>
        </div>
      </NTabPane>
    </NTabs>
  </div>
</template>
