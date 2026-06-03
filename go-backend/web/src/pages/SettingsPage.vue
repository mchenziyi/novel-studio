<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NInput, NTag, NPopconfirm, NModal, NSwitch } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const models = ref<any[]>([])
const loading = ref(true)

// Modal state
const showModal = ref(false)
const editingModel = ref<any>(null)
const form = ref({ name: '', provider: 'openai', settings:{ apiKey:'', baseURL:'', model:'' }, enabled: true, isDefault: false })
const fetching = ref(false)
const fetchedModels = ref<string[]>([])
const fetchError = ref('')
const testing = ref<string|null>(null)
const testResults = ref<Record<string,{success:boolean;latency?:number;error?:string}>>({})

// Proxy
const proxyEnabled = ref(false)
const proxyUrl = ref('http://127.0.0.1:7890')

// Style
const styles = ref<any[]>([])
const styleImport = ref({ name:'', referenceText:'' })
const showStyleImport = ref(false)

// Novel config
const novelConfig = ref<Record<string,string>>({})

const providers = [
  { label:'OpenAI', value:'openai' }, { label:'DeepSeek', value:'deepseek' }, { label:'Gemini', value:'gemini' },
  { label:'Anthropic', value:'anthropic' }, { label:'Ollama', value:'ollama' }, { label:'LM Studio', value:'lmstudio' },
  { label:'自定义', value:'custom' },
]

onMounted(async () => {
  try { const [m,s,c] = await Promise.all([api.models.list(), api.style.list(novelStore.currentNovelId), api.novels.config(novelStore.currentNovelId)]); models.value=m; styles.value=s; novelConfig.value=c||{} } catch (_) {}
  // Load proxy from settings
  try { const resp = await fetch('/api/settings'); const s=await resp.json(); if(s.proxy){proxyEnabled.value=s.proxy.enabled;proxyUrl.value=s.proxy.url||proxyUrl.value} } catch (_) {}
  loading.value = false
})

function openAdd() { editingModel.value = null; form.value = { name:'', provider:'openai', settings:{ apiKey:'', baseURL:'', model:'' }, enabled:true, isDefault:false }; fetchedModels.value=[]; fetchError.value=''; showModal.value=true }
function openEdit(m: any) {
  editingModel.value = m
  let s = typeof m.settings==='string' ? JSON.parse(m.settings) : m.settings
  form.value = { name:m.name, provider:m.provider, settings:{ apiKey:s.apiKey||'', baseURL:s.baseURL||'', model:s.model||'' }, enabled:m.enabled, isDefault:m.isDefault }
  fetchedModels.value=[]; fetchError.value=''; showModal.value=true
}
async function saveModel() {
  const data = { ...form.value, settings: { ...form.value.settings, type: form.value.provider } }
  if (editingModel.value) await api.models.update(editingModel.value.id, data)
  else await api.models.create(data)
  showModal.value=false; try { models.value=await api.models.list() } catch (_) {}
}
async function deleteModel(id:string){await api.models.delete(id);try{models.value=await api.models.list()}catch(_){}}
async function testModel(id:string) { testing.value=id; try { const resp=await fetch('/api/models/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); const r=await resp.json(); testResults.value={...testResults.value,[id]:r} } catch { testResults.value={...testResults.value,[id]:{success:false,error:'失败'}} } testing.value=null }
async function toggleDefault(id:string,val:boolean){await api.models.update(id,{isDefault:val});try{models.value=await api.models.list()}catch(_){}}
async function toggleEnabled(id:string,val:boolean){await api.models.update(id,{enabled:val});try{models.value=await api.models.list()}catch(_){}}
async function fetchModels() {
  if (!form.value.settings.apiKey && !['ollama','lmstudio'].includes(form.value.provider)) { fetchError.value='请先填写 API Key'; return }
  fetching.value=true; fetchError.value=''
  try { const d=await api.models.fetchList(form.value.provider,form.value.settings.apiKey,form.value.settings.baseURL); fetchedModels.value=d.models||[]; if(!fetchedModels.value.length) fetchError.value='未获取到可用模型' } catch(e:any){fetchError.value=e.message} finally{fetching.value=false}
}
function selectModel(name:string){form.value.settings.model=name}

async function saveProxy() {
  await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({proxy:{enabled:proxyEnabled.value,url:proxyUrl.value}})})
}
async function activateStyle(s:any){await api.style.activate(s.id);try{styles.value=await api.style.list(novelStore.currentNovelId)}catch(_){}}
async function deleteStyle(id:number){await api.style.delete(id);try{styles.value=await api.style.list(novelStore.currentNovelId)}catch(_){}}
async function importStyle() { await api.style.create(styleImport.value); showStyleImport.value=false; try{styles.value=await api.style.list(novelStore.currentNovelId)}catch(_){} }
async function saveNovelConfig(){await api.novels.updateConfig(novelStore.currentNovelId,novelConfig.value)}
</script>

<template>
  <div class="p-8 max-w-[820px] mx-auto">
    <h1 class="text-lg font-semibold text-[#1a1a1a] mb-6 tracking-tight">设置</h1>
    <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
    <div v-else class="space-y-8">
      <!-- Proxy -->
      <div class="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-[#1a1a1a] mb-3">网络代理</h2>
        <div class="flex items-center justify-between mb-3"><span class="text-sm text-[#666]">启用代理</span><NSwitch v-model:value="proxyEnabled" @update:value="saveProxy" /></div>
        <template v-if="proxyEnabled">
          <div class="flex gap-2"><NInput v-model:value="proxyUrl" size="small" placeholder="http://127.0.0.1:7890" style="flex:1" /><NButton size="small" @click="saveProxy">保存</NButton></div>
        </template>
      </div>

      <!-- Models -->
      <div class="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-[#1a1a1a]">模型配置</h2>
          <NButton size="small" @click="openAdd">+ 添加</NButton>
        </div>
        <div v-if="models.length===0" class="text-center py-12 bg-[#fafafa] rounded-lg">
          <div class="text-3xl mb-2">🤖</div>
          <div class="text-sm text-[#666] mb-1">还没有配置模型</div>
          <div class="text-xs text-[#999] mb-3">点击上方按钮添加 AI 模型</div>
          <NButton size="small" @click="openAdd">添加模型</NButton>
        </div>
        <div v-else class="space-y-2">
          <div v-for="m in models" :key="m.id" class="flex items-center gap-3 p-3 border border-[#eee] rounded-lg hover:border-[#ddd] transition-colors">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-[#1a1a1a]">{{ m.name }}</span>
                <NTag v-if="m.isDefault" size="tiny" type="info" :bordered="false">默认</NTag>
                <NTag v-if="!m.enabled" size="tiny" :bordered="false">已禁用</NTag>
              </div>
              <div class="text-xs text-[#999] mt-0.5">{{ m.provider }} · {{ typeof m.settings==='string' ? JSON.parse(m.settings).model : m.settings?.model }}</div>
            </div>
            <div class="flex gap-1 shrink-0">
              <span v-if="testResults[m.id]" class="text-[11px] px-1.5 py-0.5 rounded" :class="testResults[m.id].success?'bg-green-50 text-green-600':'bg-red-50 text-red-600'">{{ testResults[m.id].success ? testResults[m.id].latency+'ms' : '失败' }}</span>
              <NButton size="tiny" @click="testModel(m.id)" :loading="testing===m.id">测试</NButton>
              <NButton size="tiny" @click="toggleDefault(m.id,!m.isDefault)">{{ m.isDefault?'取消默认':'设为默认' }}</NButton>
              <NButton size="tiny" @click="toggleEnabled(m.id,!m.enabled)">{{ m.enabled?'禁用':'启用' }}</NButton>
              <NButton size="tiny" @click="openEdit(m)">编辑</NButton>
              <NPopconfirm @positive-click="()=>deleteModel(m.id)"><template #trigger><NButton size="tiny" type="error" ghost>删除</NButton></template>确定删除？</NPopconfirm>
            </div>
          </div>
        </div>
      </div>

      <!-- Style -->
      <div class="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-[#1a1a1a]">文风管理</h2>
          <NButton size="small" @click="showStyleImport = true">+ 导入</NButton>
        </div>
        <div v-if="styles.length===0" class="text-center py-8 text-xs text-[#999]">暂无文风配置</div>
        <div v-else class="space-y-2">
          <div v-for="s in styles" :key="s.id" class="flex items-center gap-3 p-2 border border-[#eee] rounded-lg">
            <span class="flex-1 text-sm text-[#1a1a1a]">{{ s.name }}</span>
            <NTag v-if="s.isActive" size="tiny" type="success" :bordered="false">激活</NTag>
            <NButton v-if="!s.isActive" size="tiny" @click="activateStyle(s)">激活</NButton>
            <NPopconfirm @positive-click="()=>deleteStyle(s.id)"><template #trigger><NButton size="tiny" type="error" ghost>删除</NButton></template>确定删除？</NPopconfirm>
          </div>
        </div>
      </div>

      <!-- Novel Config -->
      <div class="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-[#1a1a1a] mb-4">写作规范</h2>
        <div class="space-y-3 max-w-[400px]">
          <div><label class="text-xs text-[#666] block mb-1">目标总字数</label><NInput v-model:value="novelConfig.targetTotalWords" size="small" placeholder="300000" /></div>
          <div><label class="text-xs text-[#666] block mb-1">每章最少字数</label><NInput v-model:value="novelConfig.minWordsPerChapter" size="small" placeholder="2000" /></div>
          <div><label class="text-xs text-[#666] block mb-1">每章最多字数</label><NInput v-model:value="novelConfig.maxWordsPerChapter" size="small" placeholder="5000" /></div>
          <div><label class="text-xs text-[#666] block mb-1">文风规则（逗号分隔）</label><NInput v-model:value="novelConfig.writingStyleRules" type="textarea" size="small" :autosize="{minRows:2}" /></div>
          <div><label class="text-xs text-[#666] block mb-1">禁止写法（逗号分隔）</label><NInput v-model:value="novelConfig.forbiddenPatterns" type="textarea" size="small" :autosize="{minRows:2}" /></div>
          <div><label class="text-xs text-[#666] block mb-1">核心设定（逗号分隔）</label><NInput v-model:value="novelConfig.coreSettings" type="textarea" size="small" :autosize="{minRows:2}" /></div>
          <NButton size="small" type="primary" @click="saveNovelConfig">保存配置</NButton>
        </div>
      </div>
    </div>

    <!-- Model Modal -->
    <NModal v-if="showModal" :show="true" :on-update:show="(v:boolean)=>{showModal=v;if(!v){fetchedModels=[];fetchError=''}}" style="width:560px">
      <div class="bg-white rounded-xl p-6 shadow-xl max-h-[85vh] overflow-auto">
        <h3 class="text-base font-semibold text-[#1a1a1a] mb-4">{{ editingModel?'编辑':'添加' }}模型</h3>
        <div class="mb-4"><label class="text-xs text-[#666] block mb-1">提供商</label>
          <div class="grid grid-cols-3 gap-1.5">
            <button v-for="p in providers" :key="p.value" @click="form.provider=p.value;form.settings.baseURL=''" class="text-xs px-2 py-1.5 rounded border text-left transition-colors"
              :class="form.provider===p.value?'border-[#171717] bg-[#f5f5f5]':'border-[#e5e5e5] hover:border-[#ccc]'">{{p.label}}</button>
          </div>
        </div>
        <div class="mb-3"><label class="text-xs text-[#666] block mb-1">显示名称</label><NInput v-model:value="form.name" size="small" placeholder="如：DeepSeek V4" /></div>
        <div class="mb-3" v-if="!['ollama','lmstudio'].includes(form.provider)"><label class="text-xs text-[#666] block mb-1">API Key</label><NInput v-model:value="form.settings.apiKey" size="small" type="password" placeholder="sk-..." /></div>
        <div class="mb-3"><label class="text-xs text-[#666] block mb-1">API 地址</label><NInput v-model:value="form.settings.baseURL" size="small" placeholder="默认地址" /></div>
        <div class="mb-3">
          <div class="flex items-center justify-between mb-1"><label class="text-xs text-[#666]">模型</label><NButton size="tiny" @click="fetchModels" :loading="fetching" :disabled="!form.settings.apiKey&&!['ollama','lmstudio'].includes(form.provider)">拉取可用模型</NButton></div>
          <div v-if="fetchError" class="text-[11px] text-red-500 mb-1">{{fetchError}}</div>
          <div v-if="fetchedModels.length" class="flex flex-wrap gap-1 mb-2">
            <button v-for="fm in fetchedModels" :key="fm" @click="selectModel(fm)" class="text-[11px] px-1.5 py-0.5 rounded border hover:bg-[#f5f5f5]" :class="form.settings.model===fm?'border-[#171717] bg-[#f5f5f5]':'border-[#eee]'">{{fm}}</button>
          </div>
          <NInput v-model:value="form.settings.model" size="small" placeholder="输入模型名或从上方选择" />
        </div>
        <div class="flex gap-4 mb-5"><label class="flex items-center gap-1.5 text-xs"><NSwitch v-model:value="form.enabled" size="small" />启用</label><label class="flex items-center gap-1.5 text-xs"><NSwitch v-model:value="form.isDefault" size="small" />设为默认</label></div>
        <div class="flex justify-end gap-2"><NButton @click="showModal=false">取消</NButton><NButton type="primary" @click="saveModel" :disabled="!form.name||!form.settings.model">{{editingModel?'保存':'添加'}}</NButton></div>
      </div>
    </NModal>

    <!-- Style Import Modal -->
    <NModal v-if="showStyleImport" :show="true" :on-update:show="(v:boolean)=>{showStyleImport=v}" style="width:480px">
      <div class="bg-white rounded-xl p-6 shadow-xl">
        <h3 class="text-base font-semibold text-[#1a1a1a] mb-4">导入文风</h3>
        <div class="mb-3"><label class="text-xs text-[#666] block mb-1">名称</label><NInput v-model:value="styleImport.name" size="small" placeholder="如：金庸风格" /></div>
        <div class="mb-3"><label class="text-xs text-[#666] block mb-1">参考文本（至少500字）</label><NInput v-model:value="styleImport.referenceText" type="textarea" size="small" :autosize="{minRows:4}" /></div>
        <div class="flex justify-end gap-2"><NButton @click="showStyleImport=false">取消</NButton><NButton type="primary" @click="importStyle" :disabled="!styleImport.name||!styleImport.referenceText">导入</NButton></div>
      </div>
    </NModal>
  </div>
</template>
