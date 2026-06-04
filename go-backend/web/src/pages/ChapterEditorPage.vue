<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NPopconfirm, NSelect, NTag } from 'naive-ui'
import { CodeDiff } from 'v-code-diff'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'
import { marked } from 'marked'

const route = useRoute(); const router = useRouter(); const novelStore = useNovelStore()

// Chapter
const chapter = ref<any>({}); const content = ref(''); const wordCount = ref(0)
const saving = ref(false); const lastSaved = ref(''); const loading = ref(true)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

// Layout
const leftW = ref(50); const rightW = ref(50)
let dragging = false

// Version
type V = { id: string; source: string; timestamp: string; description: string; num: number }
const versions = ref<V[]>([]); const selectedVer = ref<V | null>(null)
const prevContent = ref('')

// AI
const messages = ref<any[]>([]); const aiInput = ref('')
const aiLoading = ref(false); const streamingMsg = ref(''); const sDone = ref(true)
const sessionId = ref(''); const model = ref('')
const ctxType = ref<'edit' | 'brainstorm' | 'analyze'>('edit')
const models = ref<{ id: string; name: string }[]>([]); const toolCalls = ref<any[]>([])
let abortCtrl: AbortController | null = null
const selectedText = ref(''); const showInline = ref(false)

// ====== LIFECYCLE ======
onMounted(async () => {
  document.addEventListener('keydown', kd)
  window.addEventListener('mousemove', dm); window.addEventListener('mouseup', du)
  await loadModels(); await loadCh()
})
onUnmounted(() => {
  document.removeEventListener('keydown', kd)
  window.removeEventListener('mousemove', dm); window.removeEventListener('mouseup', du)
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})

async function loadModels() { try { const m = await api.models.list(); models.value = m.filter((x: any) => x.enabled).map((x: any) => ({ id: x.id, name: x.name })) } catch (_) { } }
async function loadCh() {
  loading.value = true
  try { chapter.value = await api.chapters.get(route.params.id as string); content.value = chapter.value.content || ''; wordCount.value = chapter.value.wordCount || 0; await loadVer(); await loadHist() } catch (_) { chapter.value = { id: route.params.id, title: `第${parseInt(route.params.id as string)}章` }; content.value = '' }
  loading.value = false
}
async function loadVer() {
  try {
    const r = await api.chapters.history(route.params.id as string)
    versions.value = r.map((v: any, i: number) => ({ ...v, num: r.length - i }))
    if (versions.value.length >= 1) {
      selectedVer.value = versions.value[0]
      prevContent.value = (await api.chapters.diff(route.params.id as string, selectedVer.value.id, 'current')).left
    } else { prevContent.value = content.value || '' }
  } catch (_) { prevContent.value = content.value || '' }
}
async function selectVer(ver: V) {
  selectedVer.value = ver
  try { const r = await api.chapters.diff(route.params.id as string, ver.id, 'current'); prevContent.value = r.left } catch (_) { }
}
async function rollback() {
  if (!selectedVer.value) return
  await api.chapters.rollback(route.params.id as string, selectedVer.value.id)
  content.value = prevContent.value; wordCount.value = [...prevContent.value].length
  selectedVer.value = null; prevContent.value = ''; await loadVer()
}
async function loadHist() { try { const d = await api.agent.sessions(novelStore.currentNovelId); const rel = (d.sessions || []).filter((s: any) => s.chapterId === route.params.id); if (rel.length > 0) { sessionId.value = rel[0].id; const ms = await api.agent.messages(sessionId.value); messages.value = (ms.messages || []).map((m: any) => ({ ...m, toolCalls: pTC(m.metadata) })) } } catch (_) { } }
function pTC(meta: string) { try { const d = JSON.parse(meta); return (d.toolCalls || []).map((n: string) => ({ name: n, status: 'done' })) } catch { return [] } }

// ====== SAVE ======
async function doSave() { if (saving.value || !content.value) return; saving.value = true; try { wordCount.value = [...content.value].length; await api.chapters.update(route.params.id as string, { content: content.value }); lastSaved.value = new Date().toLocaleTimeString(); await loadVer() } catch (_) { } saving.value = false }
function scheduleAutoSave() { if (autoSaveTimer) clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(doSave, 30000) }
watch(content, () => { wordCount.value = [...content.value].length; scheduleAutoSave() })
watch(() => route.params.id, loadCh)
function kd(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave() } }

// ====== DRAG ======
function ds(e: MouseEvent) { dragging = true; e.preventDefault() }
function dm(e: MouseEvent) { if (!dragging) return; const p = (e.clientX / window.innerWidth) * 100; leftW.value = Math.max(20, Math.min(80, p - 2)); rightW.value = 100 - leftW.value }
function du() { dragging = false }

const editorLines = computed(() => content.value.split('\n'))
const prevLines = computed(() => prevContent.value.split('\n'))

// ====== AI ======
async function sendAi() {
  const m = aiInput.value; if (!m.trim() || (!sDone.value && streamingMsg.value)) return
  messages.value.push({ role: 'user', content: m }); aiInput.value = ''; sDone.value = false; streamingMsg.value = ''; toolCalls.value = []; aiLoading.value = true
  try {
    abortCtrl = new AbortController()
    const r = await fetch('/api/agent/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: messages.value.filter((x: any) => !x._internal).map((x: any) => ({ role: x.role, content: x.content })), novelId: novelStore.currentNovelId, chapterId: parseInt(route.params.id as string), modelId: model.value || undefined, context: ctxType.value, sessionId: sessionId.value || undefined }), signal: abortCtrl.signal })
    if (!r.ok) throw new Error('请求失败')
    const reader = r.body!.getReader(); const dec = new TextDecoder(); let buf = ''
    while (true) { const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); for (const l of buf.split('\n')) { buf = ''; if (!l.startsWith('data: ')) continue; const dd = JSON.parse(l.slice(6)); switch (dd.type) { case 'chunk': streamingMsg.value += dd.text; break; case 'tool_start': toolCalls.value.push({ name: dd.toolName, status: 'pending', input: dd.toolInput }); break; case 'tool_end': { const tc = toolCalls.value.find(t => t.name === dd.toolName && t.status === 'pending'); if (tc) { tc.status = 'done'; tc.output = dd.toolOutput } } break; case 'error': console.error(dd.error); break; case 'done': sDone.value = true; break } } }
    if (streamingMsg.value.trim()) messages.value.push({ role: 'assistant', content: streamingMsg.value, toolCalls: [...toolCalls.value] }); streamingMsg.value = ''
  } catch (e: any) { if (e.name !== 'AbortError') { messages.value.push({ role: 'assistant', content: '错误: ' + e.message, error: true }); streamingMsg.value = '' } }
  aiLoading.value = false; sDone.value = true
}
function stopAi() { abortCtrl?.abort(); aiLoading.value = false; sDone.value = true; streamingMsg.value = '' }
function mu() { const s = window.getSelection(); const t = s?.toString().trim(); if (t && t.length > 3) { selectedText.value = t; showInline.value = true } else showInline.value = false }
function aiEditSel() { if (!selectedText.value) return; aiInput.value = `修改以下段落：\n\n${selectedText.value}`; showInline.value = false; setTimeout(() => sendAi(), 100) }

function rm(t: string) { try { return marked.parse(t) as string } catch { return t } }
const tl: Record<string, string> = { getChapter: '读章节', listChapters: '列表', searchChapters: '搜索', saveChapter: '保存', getStats: '统计', getActiveStyle: '文风', getOutline: '大纲', listCharacters: '角色', listForeshadowing: '伏笔', searchMemory: '记忆', saveMemory: '记忆', createStyleFromDescription: '文风', updateNovelConfig: '写作规范' }
const sl: { [k: string]: string } = { synced: '已同步', pending: '待处理', audit: '审计中' }
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
  <div v-else class="flex flex-col h-full bg-[#fafafa]">

    <!-- Top Bar -->
    <div class="flex items-center h-10 px-4 border-b border-[#e5e5e5] bg-white shrink-0 gap-3 text-sm z-10 shadow-sm">
      <button @click="router.back()" class="text-[#666] hover:text-[#1a1a1a] shrink-0"><svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button>
      <span class="font-semibold text-[#1a1a1a]">{{chapter.id}}</span><span class="text-[#666] truncate max-w-[160px]">{{chapter.title}}</span>
      <span class="text-xs text-[#999] bg-[#f5f5f5] px-1.5 py-0.5 rounded">{{wordCount}}字</span>
      <NTag size="tiny" :type="chapter.status==='synced'?'success':chapter.status==='audit'?'warning':'default'" :bordered="false">{{sl[chapter.status]||chapter.status}}</NTag>
      <div class="flex-1"/>
      <NSelect v-model:value="ctxType" size="tiny" :options="[{label:'编辑',value:'edit'},{label:'头脑风暴',value:'brainstorm'},{label:'分析',value:'analyze'}]" style="width:100px"/>
      <NSelect v-model:value="model" size="tiny" :options="models.map((m:any)=>({label:m.name,value:m.id}))" placeholder="模型" style="width:120px" clearable/>
      <span v-if="lastSaved" class="text-xs text-[#999]">已保存于{{lastSaved}}</span>
      <NButton size="tiny" @click="doSave" :loading="saving">保存</NButton>
    </div>

    <!-- Upper: 旧版 + 编辑区 并排 -->
    <div class="flex-1 flex min-h-0 bg-white relative" style="max-height:55%">
      <!-- LEFT: 旧版本（只读） -->
      <div :style="{width:leftW+'%'}" class="border-r border-[#e5e5e5] flex flex-col shrink-0">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 gap-2">
          <svg width="11" height="11" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#fca5a5"/></svg>
          <span v-if="selectedVer">v{{selectedVer.num}} · {{selectedVer.source}} · 旧版（只读）</span>
          <span v-else>旧版（保存后自动加载）</span>
          <span class="ml-auto text-[#ccc]">{{prevLines.length}}行</span>
        </div>
        <div class="flex-1 flex min-h-0" style="font-family:'Georgia','Noto Serif SC',serif">
          <div class="shrink-0 w-[40px] bg-[#fcfcfc] border-r border-[#f0f0f0] overflow-hidden select-none">
            <div class="text-right pr-2 pt-3 text-[13px] leading-6 text-[#ccc] font-mono">
              <div v-for="(_,i) in prevLines" :key="i" class="h-6">{{i+1}}</div>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-3 text-[13px] leading-6 text-[#888] font-serif whitespace-pre select-none" style="font-family:inherit">
            {{prevContent || '（无内容）'}}
          </div>
        </div>
      </div>

      <!-- Drag -->
      <div class="w-[3px] bg-transparent hover:bg-[#ddd] cursor-col-resize shrink-0 z-10" @mousedown="ds"/>

      <!-- RIGHT: 编辑区 -->
      <div :style="{width:rightW+'%'}" class="flex flex-col shrink-0 relative">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 justify-between">
          <span>编辑区</span>
          <span>{{wordCount}}字 · {{editorLines.length}}行</span>
        </div>
        <div class="flex-1 flex min-h-0" style="font-family:'Georgia','Noto Serif SC',serif">
          <div class="shrink-0 w-[40px] bg-[#fcfcfc] border-r border-[#f0f0f0] overflow-hidden select-none">
            <div class="text-right pr-2 pt-3 text-[13px] leading-6 text-[#ccc] font-mono">
              <div v-for="(_,i) in editorLines" :key="i" class="h-6">{{i+1}}</div>
            </div>
          </div>
          <textarea v-model="content" class="flex-1 resize-none border-0 outline-none text-[13px] leading-6 text-[#1a1a1a] bg-transparent p-3 placeholder:text-[#ddd]" placeholder="开始写作..." spellcheck="false" style="white-space:pre;overflow-wrap:normal;word-break:keep-all;tab-size:2;font-family:inherit" @mouseup="mu"/>
        </div>
        <div v-if="showInline" class="absolute top-10 right-4 bg-white border border-[#e5e5e5] rounded-lg shadow-lg px-3 py-1.5 text-xs cursor-pointer hover:bg-[#f5f5f5] z-20" @click="aiEditSel">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>AI 修改所选段落
        </div>
      </div>
    </div>

    <!-- Lower: CodeDiff between old (prevContent) and new (content) -->
    <div class="border-t border-[#e5e5e5] bg-white" style="max-height:45%;flex:1;overflow:hidden">
      <div class="h-6 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#eee] shrink-0 gap-2">
        <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6h3l1-3 1 6 1-3h3" stroke="#999" stroke-width="1" fill="none"/></svg>
        <span>差异对比 ← v{selectedVer?.num} vs 当前</span>
        <div class="flex-1"/>
        <NPopconfirm v-if="selectedVer" @positive-click="rollback"><template #trigger><NButton size="tiny" type="error" ghost>还原到此版本</NButton></template>确定还原到 v{{selectedVer.num}}？</NPopconfirm>
      </div>
      <div class="overflow-auto" style="height:calc(100% - 24px)">
        <CodeDiff :old-string="prevContent" :new-string="content" output-format="side-by-side" diff-style="char" language="plaintext" :context="9999"/>
      </div>
    </div>

    <!-- Bottom bar: AI chat + version selector -->
    <div class="border-t border-[#e5e5e5] bg-white shrink-0">
      <!-- Version bar -->
      <div class="flex items-center h-7 px-3 bg-[#fafafa] gap-1 overflow-x-auto border-b border-[#eee]">
        <span class="text-[11px] text-[#999] mr-1 shrink-0">版本</span>
        <button v-for="ver in versions" :key="ver.id" @click="selectVer(ver)" class="text-[11px] px-2 py-0.5 rounded border shrink-0 transition-colors" :class="selectedVer?.id===ver.id?'bg-white border-[#bbb] text-[#1a1a1a] font-semibold shadow-sm':'border-transparent text-[#888] hover:bg-black/[0.02] hover:text-[#555]'">v{{ver.num}}</button>
      </div>

      <!-- AI Chat -->
      <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#eee] justify-between">
        <span>AI 对话</span>
        <button v-if="aiLoading" @click="stopAi" class="text-red-500 text-[11px]">停止</button>
      </div>
      <div class="overflow-auto px-3 py-1.5 space-y-1.5 text-[12px]" style="max-height:160px">
        <div v-if="messages.length===0&&!streamingMsg" class="text-center py-2 text-[#bbb]">AI 写作助手</div>
        <template v-for="(msg,i) in messages" :key="i">
          <div v-if="msg.role==='user'" class="flex justify-end"><div class="max-w-[80%] bg-[#e8e8e8] rounded-lg px-2 py-1 whitespace-pre-wrap">{{msg.content}}</div></div>
          <div v-else><div v-if="msg.error" class="text-red-500">{{msg.content}}</div><div v-else class="prose prose-xs max-w-none prose-p:my-0.5" v-html="rm(msg.content)"/><div v-if="msg.toolCalls?.length" class="flex gap-1 mt-0.5"><NTag v-for="tc in msg.toolCalls" :key="tc.name" size="tiny" :bordered="false">{{tl[tc.name]||tc.name}}</NTag></div></div>
        </template>
        <div v-if="streamingMsg"><div class="prose prose-xs max-w-none prose-p:my-0.5" v-html="rm(streamingMsg)"/><span v-if="!sDone" class="inline-block w-1 h-3 bg-[#555] animate-pulse ml-0.5 rounded-sm"/></div>
      </div>
      <div class="px-3 py-1.5 border-t border-[#eee] bg-white flex gap-2 items-center">
        <input v-model="aiInput" class="flex-1 border border-[#e5e5e5] rounded-full px-3 py-1 text-xs outline-none focus:border-[#999]" placeholder="发送消息..." @keydown.enter="sendAi()" :disabled="aiLoading"/>
        <NButton size="tiny" type="primary" @click="sendAi" :disabled="!aiInput.trim()||aiLoading" round>发送</NButton>
      </div>
    </div>
  </div>
</template>
