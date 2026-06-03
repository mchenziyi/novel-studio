<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NPopconfirm, NSelect, NTag } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const novelStore = useNovelStore()

// Chapter state
const chapter = ref<any>({})
const content = ref('')
const wordCount = ref(0)
const saving = ref(false)
const lastSaved = ref('')
const loading = ref(true)
const autoSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Three-panel layout
const leftW = ref(28); const midW = ref(44); const rightW = ref(28)
let dragging: 'left' | 'right' | null = null

// Version diff state
type VerItem = { id: string; source: string; timestamp: string; description: string; num: number }
const versions = ref<VerItem[]>([])
const selectedVersion = ref<VerItem | null>(null)
const prevContent = ref('')
const diffBlocks = ref<any[]>([])

// AI Chat state
const messages = ref<any[]>([])
const aiInput = ref('')
const aiLoading = ref(false)
const streamingMsg = ref('')
const streamDone = ref(true)
const sessionId = ref('')
const model = ref('')
const contextType = ref<'edit' | 'brainstorm' | 'analyze'>('edit')
const models = ref<{id:string;name:string}[]>([])
const toolCalls = ref<any[]>([])
let abortCtrl: AbortController | null = null

// Sync scroll
const leftScroll = ref<HTMLElement>()
const editorScroll = ref<HTMLElement>()
let vSync = false

// Paragraph selector
const selectedText = ref('')
const showInlineBtn = ref(false)

// =============== LIFECYCLE ===============
onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  await loadModels()
  await loadChapter()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  if (autoSaveTimer.value) clearTimeout(autoSaveTimer.value)
})

async function loadModels() {
  try { const m = await api.models.list(); models.value = m.filter((x:any)=>x.enabled).map((x:any)=>({id:x.id,name:x.name})) } catch (_) {}
}

async function loadChapter() {
  loading.value = true
  try {
    chapter.value = await api.chapters.get(route.params.id as string)
    content.value = chapter.value.content || ''
    wordCount.value = chapter.value.wordCount || 0
    await loadVersions()
    await loadChatHistory()
  } catch (_) {
    chapter.value = { id: route.params.id, title: `第${parseInt(route.params.id as string)}章` }
    content.value = ''
  }
  loading.value = false
}

async function loadVersions() {
  try {
    const raw = await api.chapters.history(route.params.id as string)
    versions.value = raw.map((v:any,i:number)=>({...v,num:raw.length-i}))
    if (versions.value.length >= 2) selectVersion(versions.value[1])
  } catch (_) {}
}

async function loadChatHistory() {
  try {
    const data = await api.agent.sessions(novelStore.currentNovelId)
    const related = (data.sessions||[]).filter((s:any)=>s.chapterId===route.params.id)
    if (related.length > 0) {
      sessionId.value = related[0].id
      const msgs = await api.agent.messages(sessionId.value)
      messages.value = (msgs.messages||[]).map((m:any)=>({
        ...m,
        toolCalls: parseToolCalls(m.metadata)
      }))
    }
  } catch (_) {}
}

function parseToolCalls(meta: string) {
  try { const d=JSON.parse(meta); return (d.toolCalls||[]).map((n:string)=>({name:n,status:'done'})) } catch { return [] }
}

// =============== SAVE ===============
async function doSave() {
  if (saving.value || !content.value) return
  saving.value = true
  try {
    wordCount.value = [...content.value].length
    await api.chapters.update(route.params.id as string, { content: content.value })
    lastSaved.value = new Date().toLocaleTimeString()
    await loadVersions()
  } catch (_) {}
  saving.value = false
}

function scheduleAutoSave() {
  if (autoSaveTimer.value) clearTimeout(autoSaveTimer.value)
  autoSaveTimer.value = setTimeout(doSave, 30000)
}

watch(content, () => { wordCount.value = [...content.value].length; scheduleAutoSave() })
watch(() => route.params.id, loadChapter)

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); doSave() }
}

// =============== DRAG ===============
function onDragStart(e: MouseEvent, side: 'left'|'right') { dragging = side; e.preventDefault() }
function onDragMove(e: MouseEvent) {
  if (!dragging) return; const total = leftW.value+midW.value+rightW.value; const pct = (e.clientX/window.innerWidth)*100
  if (dragging==='left') { leftW.value=Math.max(15,Math.min(45,pct-total*0.05)); midW.value=Math.max(20,total-leftW.value-rightW.value) }
  else { rightW.value=Math.max(15,Math.min(45,total-pct)); midW.value=Math.max(20,total-leftW.value-rightW.value) }
}
function onDragEnd() { dragging = null }

// =============== VERSION DIFF ===============
async function selectVersion(ver: VerItem) {
  selectedVersion.value = ver
  try {
    const result = await api.chapters.diff(route.params.id as string, ver.id, 'current')
    prevContent.value = result.left; diffBlocks.value = result.diff || []
  } catch (_) { prevContent.value = '无法加载'; diffBlocks.value = [] }
}

async function rollback() {
  if (!selectedVersion.value) return
  await api.chapters.rollback(route.params.id as string, selectedVersion.value.id)
  content.value = prevContent.value
  wordCount.value = [...prevContent.value].length
  selectedVersion.value = null; prevContent.value = ''; diffBlocks.value = []
  await loadVersions()
}

function onLeftVS() { if (vSync||!editorScroll.value) return; vSync=true; editorScroll.value.scrollTop=leftScroll.value!.scrollTop; editorScroll.value.scrollLeft=leftScroll.value!.scrollLeft; requestAnimationFrame(()=>vSync=false) }
function onEditorScroll() { if (vSync||!leftScroll.value) return; vSync=true; leftScroll.value.scrollTop=editorScroll.value!.scrollTop; leftScroll.value.scrollLeft=editorScroll.value!.scrollLeft; requestAnimationFrame(()=>vSync=false) }

const leftLines = computed(()=>prevContent.value.split('\n'))
const editorLines = computed(() => content.value.split('\n'))

function renderDiffLine(text:string, blockType:string, side:'left'|'right', cd:any, lineOff:number): string {
  if (!cd || blockType==='equal') return esc(text||' ')
  if (side==='left' && blockType!=='delete') return esc(text||' ')
  if (side==='right' && blockType!=='insert') return esc(text||' ')
  if (cd.oldLine!==lineOff && cd.newLine!==lineOff) return esc(text||' ')
  const runes=[...text]; const {prefixLen,suffixLen,oldLen,newLen}=cd
  const pre=runes.slice(0,prefixLen).join('')
  const end=side==='left'?oldLen:newLen
  const mid=runes.slice(prefixLen,end-suffixLen).join('')
  const suf=runes.slice(end-suffixLen).join('')
  const color=side==='left'?'#fca5a5':'#86efac'
  return esc(pre)+'<span style="background:'+color+'">'+esc(mid)+'</span>'+esc(suf)
}
function esc(s:string){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function lineClass(bt:string,side:'left'|'right'){if(bt==='delete'&&side==='left')return'bg-red-50/80';if(bt==='insert'&&side==='right')return'bg-green-50/80';return''}

// =============== AI CHAT ===============
async function sendAi() {
  const msg = aiInput.value; if (!msg.trim() || (!streamDone.value && streamingMsg.value)) return
  messages.value.push({ role: 'user', content: msg }); aiInput.value = ''
  streamDone.value = false; streamingMsg.value = ''; toolCalls.value = []; aiLoading.value = true

  try {
    abortCtrl = new AbortController()
    const resp = await fetch('/api/agent/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.filter((m:any)=>!m._internal).map((m:any)=>({role:m.role,content:m.content})),
        novelId: novelStore.currentNovelId, chapterId: parseInt(route.params.id as string),
        modelId: model.value || undefined, context: contextType.value, sessionId: sessionId.value || undefined,
      }),
      signal: abortCtrl.signal,
    })
    if (!resp.ok) throw new Error('请求失败')
    const reader = resp.body!.getReader(); const decoder = new TextDecoder(); let buf = ''
    while (true) { const {done,value}=await reader.read(); if(done)break; buf+=decoder.decode(value,{stream:true}); const lines=buf.split('\n');buf=lines.pop()||''; for(const l of lines){if(!l.startsWith('data: '))continue; const d=JSON.parse(l.slice(6));switch(d.type){case'chunk':streamingMsg.value+=d.text;break;case'tool_start':toolCalls.value.push({name:d.toolName,status:'pending',input:d.toolInput});break;case'tool_end':{const tc=toolCalls.value.find(t=>t.name===d.toolName&&t.status==='pending');if(tc){tc.status='done';tc.output=d.toolOutput}}break;case'error':console.error(d.error);break;case'done':streamDone.value=true;break}} }
    if (streamingMsg.value.trim()) { messages.value.push({role:'assistant',content:streamingMsg.value,toolCalls:[...toolCalls.value]}) }
    streamingMsg.value = ''
  } catch(e:any) { if(e.name!=='AbortError'){messages.value.push({role:'assistant',content:'错误: '+e.message,error:true});streamingMsg.value=''} }
  aiLoading.value = false; streamDone.value = true
}

function stopAi() { abortCtrl?.abort(); aiLoading.value = false; streamDone.value = true; streamingMsg.value = '' }

function onMouseUp() {
  const sel = window.getSelection(); const text = sel?.toString().trim()
  if (text && text.length > 3) { selectedText.value = text; showInlineBtn.value = true }
  else showInlineBtn.value = false
}

function aiEditSelected() {
  if (!selectedText.value) return
  const prompt = `修改以下段落：\n\n${selectedText.value}`
  aiInput.value = prompt; showInlineBtn.value = false
  setTimeout(() => sendAi(), 100)
}

const toolLabels: Record<string,string> = {
  getChapter:'读章节',listChapters:'列表',searchChapters:'搜索',saveChapter:'保存',getStats:'统计',
  getActiveStyle:'文风',getOutline:'大纲',listCharacters:'角色',listForeshadowing:'伏笔',
  searchMemory:'记忆',saveMemory:'记忆',createStyleFromDescription:'文风',updateNovelConfig:'写作规范',
}

function renderMD(t:string){try{return marked.parse(t)as string}catch{return t}}

const statusLabel:{[k:string]:string} = {synced:'已同步',pending:'待处理',audit:'审计中'}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
  <div v-else class="flex flex-col h-full bg-[#fafafa]">
    <!-- Top Bar -->
    <div class="flex items-center h-10 px-4 border-b border-[#e5e5e5] bg-white shrink-0 gap-3 text-sm z-10 shadow-sm">
      <button @click="router.back()" class="text-[#666] hover:text-[#1a1a1a] flex items-center gap-1 shrink-0">
        <svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>返回</button>
      <span class="font-semibold text-[#1a1a1a]">{{ chapter.id }}</span>
      <span class="text-[#666] truncate max-w-[180px]">{{ chapter.title }}</span>
      <span class="text-xs text-[#999] bg-[#f5f5f5] px-1.5 py-0.5 rounded">{{ wordCount }}字</span>
      <NTag size="tiny" :type="chapter.status==='synced'?'success':chapter.status==='audit'?'warning':'default'" :bordered="false">{{ statusLabel[chapter.status]||chapter.status }}</NTag>
      <div class="flex-1" />
      <NSelect v-model:value="contextType" size="tiny" :options="[{label:'编辑',value:'edit'},{label:'头脑风暴',value:'brainstorm'},{label:'分析',value:'analyze'}]" style="width:100px" />
      <NSelect v-model:value="model" size="tiny" :options="models.map((m:any)=>({label:m.name,value:m.id}))" placeholder="模型" style="width:120px" clearable />
      <span v-if="lastSaved" class="text-xs text-[#999]">已保存于 {{ lastSaved }}</span>
      <NButton size="tiny" @click="doSave" :loading="saving">保存</NButton>
    </div>

    <!-- Three panels with drag handles -->
    <div class="flex-1 flex min-h-0 bg-white relative">
      <!-- Panel 1: Version diff (left) -->
      <div :style="{ width: leftW + '%' }" class="border-r border-[#e5e5e5] flex flex-col shrink-0">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono gap-2">
          <svg width="11" height="11" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#fca5a5"/></svg>
          <span v-if="selectedVersion">v{{ selectedVersion.num }} · {{ selectedVersion.source }}</span>
          <span v-else>选择版本</span>
          <span class="ml-auto">{{ prevContent ? leftLines.length + '行' : '' }}</span>
        </div>
        <div v-if="selectedVersion" ref="leftScroll" class="flex-1 overflow-auto font-mono text-[12px] bg-[#fefefe]" @scroll="onLeftVS">
          <table class="w-max min-w-full table-fixed border-collapse"><colgroup><col style="width:36px"><col></colgroup><tbody>
            <template v-for="(block,bi) in diffBlocks" :key="'l'+bi">
              <template v-if="block.type!=='insert'">
                <tr v-for="li in (block.leftLines[1]-block.leftLines[0]+1)" :key="'ll'+bi+'-'+li" :class="lineClass(block.type,'left')">
                  <td class="text-[11px] text-[#ccc] text-right pr-1.5 select-none align-top pt-px font-mono leading-5 border-r border-[#f0f0f0]">{{block.leftLines[0]+li}}</td>
                  <td class="pl-2 pr-2 whitespace-pre-wrap break-all leading-5" v-html="renderDiffLine(leftLines[block.leftLines[0]+li-1]||' ',block.type,'left',(block.charDiffs||[]).find((cd:any)=>cd.oldLine===li-1),li-1)"/></tr>
              </template>
            </template>
          </tbody></table>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-xs text-[#ccc] select-none">点击底部版本号开始对比</div>
      </div>

      <!-- Drag handle 1 -->
      <div class="w-[3px] bg-transparent hover:bg-[#ddd] cursor-col-resize shrink-0 z-10 transition-colors" @mousedown="(e:any)=>onDragStart(e,'left')" />

      <!-- Panel 2: Editor (middle) with line numbers -->
      <div :style="{ width: midW + '%' }" class="flex flex-col shrink-0 relative">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono justify-between">
          <span>编辑区</span><span>{{ wordCount }}字 · {{ editorLines.length }}行</span>
        </div>
        <div ref="editorScroll" class="flex-1 overflow-auto" @scroll="onEditorScroll">
          <div class="flex min-h-full font-mono text-[13px] leading-6">
            <!-- Line numbers gutter -->
            <div class="shrink-0 select-none text-right pr-2 pt-4 pb-4 text-[11px] text-[#ccc] bg-[#fcfcfc] border-r border-[#f0f0f0]" style="width:44px">
              <div v-for="(_, i) in editorLines" :key="i" class="leading-6">{{ i + 1 }}</div>
            </div>
            <!-- Textarea -->
            <textarea v-model="content" class="flex-1 resize-none border-0 outline-none text-sm text-[#1a1a1a] bg-transparent p-4 font-serif placeholder:text-[#ddd]" 
              placeholder="开始写作..." spellcheck="false" style="font-family: 'Georgia','Noto Serif SC',serif; line-height:1.5rem" @mouseup="onMouseUp" />
          </div>
        </div>
        <div v-if="showInlineBtn" class="absolute top-10 right-4 bg-white border border-[#e5e5e5] rounded-lg shadow-lg px-3 py-1.5 text-xs cursor-pointer hover:bg-[#f5f5f5] z-20" @click="aiEditSelected">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>AI 修改所选段落</div>
      </div>

      <!-- Drag handle 2 -->
      <div class="w-[3px] bg-transparent hover:bg-[#ddd] cursor-col-resize shrink-0 z-10 transition-colors" @mousedown="(e:any)=>onDragStart(e,'right')" />

      <!-- Panel 3: AI Chat (right) -->
      <div :style="{ width: rightW + '%' }" class="flex flex-col shrink-0 border-l border-[#e5e5e5] bg-[#fafafa]">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono justify-between">
          <span>AI 对话</span>
          <button v-if="aiLoading" @click="stopAi" class="text-red-500 text-[11px]">停止</button>
        </div>
        <div class="flex-1 overflow-auto px-2 py-1.5 space-y-1.5 text-[12px]">
          <div v-if="messages.length===0&&!streamingMsg" class="text-center py-8 text-[#bbb] select-none">AI 写作助手</div>
          <template v-for="(msg,i) in messages" :key="i">
            <div v-if="msg.role==='user'" class="flex justify-end"><div class="max-w-[90%] bg-[#e8e8e8] rounded-lg px-2 py-1 whitespace-pre-wrap">{{msg.content}}</div></div>
            <div v-else class="text-[#333] leading-relaxed">
              <div v-if="msg.error" class="text-red-500">{{msg.content}}</div>
              <div v-else class="prose prose-xs max-w-none prose-p:my-0.5" v-html="renderMD(msg.content)"/>
              <div v-if="msg.toolCalls?.length" class="flex flex-wrap gap-1 mt-0.5">
                <NTag v-for="tc in msg.toolCalls" :key="tc.name" size="tiny" :bordered="false" :type="tc.status==='error'?'error':'default'">{{toolLabels[tc.name]||tc.name}}</NTag>
              </div>
            </div>
          </template>
          <div v-if="streamingMsg"><div class="prose prose-xs max-w-none prose-p:my-0.5" v-html="renderMD(streamingMsg)"/><span v-if="!streamDone" class="inline-block w-1 h-3 bg-[#555] animate-pulse ml-0.5 align-middle rounded-sm"/></div>
          <div v-if="toolCalls.length&&!streamingMsg" class="flex flex-wrap gap-1"><NTag v-for="tc in toolCalls" :key="tc.name" size="tiny" :bordered="false" :type="tc.status==='error'?'error':'default'">{{toolLabels[tc.name]||tc.name}}</NTag></div>
        </div>
        <div class="px-2 py-1.5 border-t border-[#eee] bg-white flex gap-1.5">
          <input v-model="aiInput" class="flex-1 border border-[#e5e5e5] rounded-full px-3 py-1 text-xs outline-none focus:border-[#999]" placeholder="发送消息..." @keydown.enter="sendAi()" :disabled="aiLoading" />
          <NButton size="tiny" type="primary" @click="sendAi" :disabled="!aiInput.trim()||aiLoading" round>发送</NButton>
        </div>
      </div>
    </div>

    <!-- Bottom: version bar -->
    <div class="border-t border-[#e5e5e5] bg-white shrink-0">
      <div class="flex items-center h-8 px-3 border-b border-[#eee] bg-[#fafafa] gap-1 overflow-x-auto">
        <span class="text-[11px] text-[#999] mr-1 shrink-0 flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6h3l1-3 1 6 1-3h3" stroke="#999" stroke-width="1" fill="none"/></svg>版本</span>
        <button v-for="ver in versions" :key="ver.id" @click="selectVersion(ver)" class="text-[11px] px-2 py-0.5 rounded border shrink-0 transition-colors"
          :class="selectedVersion?.id===ver.id?'bg-white border-[#bbb] text-[#1a1a1a] font-semibold shadow-sm':'border-transparent text-[#888] hover:bg-black/[0.02] hover:text-[#555]'">v{{ver.num}}</button>
        <div class="flex-1"/>
        <NPopconfirm v-if="selectedVersion" @positive-click="rollback"><template #trigger><NButton size="tiny" type="error" ghost>还原到 v{{selectedVersion.num}}</NButton></template>确定还原？</NPopconfirm>
      </div>
    </div>
  </div>
</template>
