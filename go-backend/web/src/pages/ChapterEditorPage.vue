<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NPopconfirm, NSelect, NTag } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'
import { marked } from 'marked'

const route = useRoute(); const router = useRouter(); const novelStore = useNovelStore()

// Chapter state
const chapter = ref<any>({}); const content = ref(''); const wordCount = ref(0)
const saving = ref(false); const lastSaved = ref(''); const loading = ref(true)
let autoSaveTimer: ReturnType<typeof setTimeout>|null = null

// Layout
const leftW = ref(28); const midW = ref(44); const rightW = ref(28)
let dragging: 'left'|'right'|null = null

// Version diff
type V = { id:string; source:string; timestamp:string; description:string; num:number }
const versions = ref<V[]>([]); const selectedVer = ref<V|null>(null)
const prevContent = ref(''); const diffBlocks = ref<any[]>([])

// Scroll sync
const leftGut = ref<HTMLElement>(); const leftCon = ref<HTMLElement>()
const edtGut = ref<HTMLElement>(); const edtText = ref<HTMLTextAreaElement>()

// AI
const messages = ref<any[]>([]); const aiInput = ref(''); const aiLoading = ref(false)
const streamingMsg = ref(''); const sDone = ref(true); const sessionId = ref('')
const model = ref(''); const ctxType = ref<'edit'|'brainstorm'|'analyze'>('edit')
const models = ref<{id:string;name:string}[]>([]); const toolCalls = ref<any[]>([])
let abortCtrl: AbortController|null = null

// Paragraph
const selectedText = ref(''); const showInline = ref(false)

// ====== LIFECYCLE ======
onMounted(async()=>{
  document.addEventListener('keydown',kd); document.addEventListener('mouseup',mu)
  window.addEventListener('mousemove',dm); window.addEventListener('mouseup',du)
  await loadModels(); await loadCh()
})
onUnmounted(()=>{
  document.removeEventListener('keydown',kd); document.removeEventListener('mouseup',mu)
  window.removeEventListener('mousemove',dm); window.removeEventListener('mouseup',du)
  if(autoSaveTimer)clearTimeout(autoSaveTimer)
})

async function loadModels(){try{const m=await api.models.list();models.value=m.filter((x:any)=>x.enabled).map((x:any)=>({id:x.id,name:x.name}))}catch(_){}}
async function loadCh(){
  loading.value=true
  try{chapter.value=await api.chapters.get(route.params.id as string);content.value=chapter.value.content||'';wordCount.value=chapter.value.wordCount||0;await loadVer();await loadHist()}catch(_){chapter.value={id:route.params.id,title:`第${parseInt(route.params.id as string)}章`};content.value=''}
  loading.value=false
}
async function loadVer(){try{const r=await api.chapters.history(route.params.id as string);versions.value=r.map((v:any,i:number)=>({...v,num:r.length-i}));if(versions.value.length>=2)selectVer(versions.value[1])}catch(_){}}
async function loadHist(){try{const d=await api.agent.sessions(novelStore.currentNovelId);const rel=(d.sessions||[]).filter((s:any)=>s.chapterId===route.params.id);if(rel.length>0){sessionId.value=rel[0].id;const ms=await api.agent.messages(sessionId.value);messages.value=(ms.messages||[]).map((m:any)=>({...m,toolCalls:pTC(m.metadata)}))}}catch(_){}}
function pTC(meta:string){try{const d=JSON.parse(meta);return(d.toolCalls||[]).map((n:string)=>({name:n,status:'done'}))}catch{return[]}}

// ====== SAVE ======
async function doSave(){if(saving.value||!content.value)return;saving.value=true;try{wordCount.value=[...content.value].length;await api.chapters.update(route.params.id as string,{content:content.value});lastSaved.value=new Date().toLocaleTimeString();await loadVer()}catch(_){}saving.value=false}
function scheduleAutoSave(){if(autoSaveTimer)clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(doSave,30000)}
watch(content,()=>{wordCount.value=[...content.value].length;scheduleAutoSave()})
watch(()=>route.params.id,loadCh)
function kd(e:KeyboardEvent){if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();doSave()}}

// ====== DRAG ======
function ds(e:MouseEvent,s:'left'|'right'){dragging=s;e.preventDefault()}
function dm(e:MouseEvent){if(!dragging)return;const t=leftW.value+midW.value+rightW.value;const p=(e.clientX/window.innerWidth)*100;if(dragging==='left'){leftW.value=Math.max(12,Math.min(40,p-t*0.05));midW.value=Math.max(20,t-leftW.value-rightW.value)}else{rightW.value=Math.max(12,Math.min(40,t-p));midW.value=Math.max(20,t-leftW.value-rightW.value)}}
function du(){dragging=null}

// ====== SCROLL SYNC ======
// panelMap tracks which gutter + content pair belongs to each panel
function syncLeftScroll(e: Event) {
  const src = e.target as HTMLElement
  const t = src.scrollTop, l = src.scrollLeft
  // Sync left gutter vertically
  if (leftGut.value) leftGut.value.scrollTop = t
  // Sync editor: textarea vertically + horizontally
  if (edtText.value) { edtText.value.scrollTop = t; edtText.value.scrollLeft = l }
  // Sync editor gutter vertically
  if (edtGut.value) edtGut.value.scrollTop = t
}

function syncEditorScroll() {
  const ta = edtText.value; if (!ta) return
  const t = ta.scrollTop, l = ta.scrollLeft
  // Sync editor gutter
  if (edtGut.value) edtGut.value.scrollTop = t
  // Sync left panel
  if (leftGut.value) leftGut.value.scrollTop = t
  if (leftCon.value) { leftCon.value.scrollTop = t; leftCon.value.scrollLeft = l }
}

// Reset all scroll positions (called when selecting a new version)
function resetAllScrolls() {
  setTimeout(() => {
    for (const el of [leftGut.value, leftCon.value, edtGut.value, edtText.value]) {
      if (el) el.scrollTop = 0
    }
  }, 50)
}

// ====== VERSION DIFF ======
async function selectVer(ver:V){selectedVer.value=ver;try{const r=await api.chapters.diff(route.params.id as string,ver.id,'current');prevContent.value=r.left;diffBlocks.value=r.diff||[];resetAllScrolls()}catch(_){prevContent.value='';diffBlocks.value=[]}}
async function rollback(){if(!selectedVer.value)return;await api.chapters.rollback(route.params.id as string,selectedVer.value.id);content.value=prevContent.value;wordCount.value=[...prevContent.value].length;selectedVer.value=null;prevContent.value='';diffBlocks.value=[];await loadVer()}

const leftLines=computed(()=>prevContent.value.split('\n'))
const editorLines=computed(()=>content.value.split('\n'))

function rdl(text:string,bt:string,side:'left'|'right',cd:any,lo:number):string{
  if(!cd||bt==='equal')return esc(text||' ')
  if(side==='left'&&bt!=='delete')return esc(text||' ')
  if(side==='right'&&bt!=='insert')return esc(text||' ')
  if(cd.oldLine!==lo&&cd.newLine!==lo)return esc(text||' ')
  const r=[...text];const{prefixLen,suffixLen,oldLen,newLen}=cd
  const p=r.slice(0,prefixLen).join('');const e=side==='left'?oldLen:newLen
  const m=r.slice(prefixLen,e-suffixLen).join('');const s=r.slice(e-suffixLen).join('')
  const c=side==='left'?'#fca5a5':'#86efac'
  return esc(p)+'<span style="background:'+c+'">'+esc(m)+'</span>'+esc(s)
}
function esc(s:string){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function lc(bt:string,s:'left'|'right'):string{if(bt==='delete'&&s==='left')return'bg-red-50/80';if(bt==='insert'&&s==='right')return'bg-green-50/80';return''}

// ====== AI ======
async function sendAi(){
  const m=aiInput.value;if(!m.trim()||(!sDone.value&&streamingMsg.value))return
  messages.value.push({role:'user',content:m});aiInput.value='';sDone.value=false;streamingMsg.value='';toolCalls.value=[];aiLoading.value=true
  try{
    abortCtrl=new AbortController()
    const r=await fetch('/api/agent/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:messages.value.filter((x:any)=>!x._internal).map((x:any)=>({role:x.role,content:x.content})),novelId:novelStore.currentNovelId,chapterId:parseInt(route.params.id as string),modelId:model.value||undefined,context:ctxType.value,sessionId:sessionId.value||undefined}),signal:abortCtrl.signal})
    if(!r.ok)throw new Error('请求失败')
    const reader=r.body!.getReader();const dec=new TextDecoder();let buf=''
    while(true){const{value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});for(const l of buf.split('\n')){buf='';if(!l.startsWith('data: '))continue;const dd=JSON.parse(l.slice(6));switch(dd.type){case'chunk':streamingMsg.value+=dd.text;break;case'tool_start':toolCalls.value.push({name:dd.toolName,status:'pending',input:dd.toolInput});break;case'tool_end':{const tc=toolCalls.value.find(t=>t.name===dd.toolName&&t.status==='pending');if(tc){tc.status='done';tc.output=dd.toolOutput}}break;case'error':console.error(dd.error);break;case'done':sDone.value=true;break}}}
    if(streamingMsg.value.trim())messages.value.push({role:'assistant',content:streamingMsg.value,toolCalls:[...toolCalls.value]});streamingMsg.value=''
  }catch(e:any){if(e.name!=='AbortError'){messages.value.push({role:'assistant',content:'错误: '+e.message,error:true});streamingMsg.value=''}}
  aiLoading.value=false;sDone.value=true
}
function stopAi(){abortCtrl?.abort();aiLoading.value=false;sDone.value=true;streamingMsg.value=''}
function mu(){const s=window.getSelection();const t=s?.toString().trim();if(t&&t.length>3){selectedText.value=t;showInline.value=true}else showInline.value=false}
function aiEditSel(){if(!selectedText.value)return;aiInput.value=`修改以下段落：\n\n${selectedText.value}`;showInline.value=false;setTimeout(()=>sendAi(),100)}

const tl:Record<string,string>={getChapter:'读章节',listChapters:'列表',searchChapters:'搜索',saveChapter:'保存',getStats:'统计',getActiveStyle:'文风',getOutline:'大纲',listCharacters:'角色',listForeshadowing:'伏笔',searchMemory:'记忆',saveMemory:'记忆',createStyleFromDescription:'文风',updateNovelConfig:'写作规范'}
function rm(t:string){try{return marked.parse(t)as string}catch{return t}}
const sl:{[k:string]:string}={synced:'已同步',pending:'待处理',audit:'审计中'}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin"/></div>
  <div v-else class="flex flex-col h-full bg-[#fafafa]">
    <!-- Top Bar -->
    <div class="flex items-center h-10 px-4 border-b border-[#e5e5e5] bg-white shrink-0 gap-3 text-sm z-10 shadow-sm">
      <button @click="router.back()" class="text-[#666] hover:text-[#1a1a1a] shrink-0 flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button>
      <span class="font-semibold text-[#1a1a1a]">{{chapter.id}}</span><span class="text-[#666] truncate max-w-[160px]">{{chapter.title}}</span>
      <span class="text-xs text-[#999] bg-[#f5f5f5] px-1.5 py-0.5 rounded">{{wordCount}}字</span>
      <NTag size="tiny" :type="chapter.status==='synced'?'success':chapter.status==='audit'?'warning':'default'" :bordered="false">{{sl[chapter.status]||chapter.status}}</NTag>
      <div class="flex-1"/>
      <NSelect v-model:value="ctxType" size="tiny" :options="[{label:'编辑',value:'edit'},{label:'头脑风暴',value:'brainstorm'},{label:'分析',value:'analyze'}]" style="width:100px"/>
      <NSelect v-model:value="model" size="tiny" :options="models.map((m:any)=>({label:m.name,value:m.id}))" placeholder="模型" style="width:120px" clearable/>
      <span v-if="lastSaved" class="text-xs text-[#999]">已保存于{{lastSaved}}</span>
      <NButton size="tiny" @click="doSave" :loading="saving">保存</NButton>
    </div>

    <!-- Three panels -->
    <div class="flex-1 flex min-h-0 bg-white relative">
      <!-- PANEL 1: Version diff -->
      <div :style="{width:leftW+'%'}" class="border-r border-[#e5e5e5] flex flex-col shrink-0">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 gap-2">
          <svg width="11" height="11" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#fca5a5"/></svg>
          <span v-if="selectedVer">v{{selectedVer.num}} · {{selectedVer.source}}</span><span v-else>选择版本</span>
          <span class="ml-auto">{{prevContent?leftLines.length+'行':''}}</span>
        </div>
        <div v-if="selectedVer" class="flex-1 flex min-h-0">
          <div ref="leftGut" class="shrink-0 w-[44px] bg-[#fcfcfc] border-r border-[#f0f0f0] overflow-hidden select-none">
            <div class="text-right pr-1.5 text-[11px] leading-6 text-[#ccc]">
              <template v-for="(bk,bi) in diffBlocks" :key="'lg'+bi">
                <template v-if="bk.type!=='insert'">
                  <div v-for="li in (bk.leftLines[1]-bk.leftLines[0]+1)" :key="'lgi'+bi+'-'+li" class="h-6" :class="lc(bk.type,'left')">{{bk.leftLines[0]+li}}</div>
                </template>
              </template>
            </div>
          </div>
          <div ref="leftCon" class="flex-1 overflow-auto" @scroll="syncLeftScroll">
            <div class="text-[13px] leading-6 min-w-full" style="font-family:'Georgia','Noto Serif SC',serif">
              <template v-for="(bk,bi) in diffBlocks" :key="'lc'+bi">
                <template v-if="bk.type!=='insert'">
                  <div v-for="li in (bk.leftLines[1]-bk.leftLines[0]+1)" :key="'lci'+bi+'-'+li" class="whitespace-pre pl-2 pr-2 h-6" :class="lc(bk.type,'left')" v-html="rdl(leftLines[bk.leftLines[0]+li-1]||' ',bk.type,'left',(bk.charDiffs||[]).find((cd:any)=>cd.oldLine===li-1),li-1)"/>
                </template>
              </template>
            </div>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-xs text-[#ccc] select-none">点击底部版本号开始对比</div>
      </div>

      <!-- Drag 1 -->
      <div class="w-[3px] bg-transparent hover:bg-[#ddd] cursor-col-resize shrink-0 z-10 transition-colors" @mousedown="(e:any)=>ds(e,'left')"/>

      <!-- PANEL 2: Editor -->
      <div :style="{width:midW+'%'}" class="flex flex-col shrink-0 relative">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 justify-between">
          <span>编辑区</span><span>{{wordCount}}字 · {{editorLines.length}}行</span>
        </div>
        <div class="flex-1 flex min-h-0" style="font-family:'Georgia','Noto Serif SC',serif">
          <div ref="edtGut" class="shrink-0 w-[44px] bg-[#fcfcfc] border-r border-[#f0f0f0] overflow-hidden select-none">
            <div class="text-right pr-1.5 pt-4 text-[11px] leading-6 text-[#ccc]">
              <div v-for="(_,i) in editorLines" :key="i" class="h-6">{{i+1}}</div>
            </div>
          </div>
          <textarea ref="edtText" v-model="content" class="flex-1 resize-none border-0 outline-none text-[13px] leading-6 text-[#1a1a1a] bg-transparent p-4 placeholder:text-[#ddd]"
            placeholder="开始写作..." spellcheck="false" style="white-space:pre;overflow-wrap:normal;word-break:keep-all;tab-size:2;font-family:inherit" @mouseup="mu" @scroll="syncEditorScroll"/>
        </div>
        <div v-if="showInline" class="absolute top-10 right-4 bg-white border border-[#e5e5e5] rounded-lg shadow-lg px-3 py-1.5 text-xs cursor-pointer hover:bg-[#f5f5f5] z-20" @click="aiEditSel">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>AI 修改所选段落</div>
      </div>

      <!-- Drag 2 -->
      <div class="w-[3px] bg-transparent hover:bg-[#ddd] cursor-col-resize shrink-0 z-10 transition-colors" @mousedown="(e:any)=>ds(e,'right')"/>

      <!-- PANEL 3: Chat -->
      <div :style="{width:rightW+'%'}" class="flex flex-col shrink-0 border-l border-[#e5e5e5] bg-[#fafafa]">
        <div class="h-7 px-3 flex items-center text-[11px] text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 justify-between">
          <span>AI 对话</span><button v-if="aiLoading" @click="stopAi" class="text-red-500 text-[11px]">停止</button>
        </div>
        <div class="flex-1 overflow-auto px-2 py-1.5 space-y-1.5 text-[12px]">
          <div v-if="messages.length===0&&!streamingMsg" class="text-center py-8 text-[#bbb]">AI 写作助手</div>
          <template v-for="(msg,i) in messages" :key="i">
            <div v-if="msg.role==='user'" class="flex justify-end"><div class="max-w-[90%] bg-[#e8e8e8] rounded-lg px-2 py-1 whitespace-pre-wrap">{{msg.content}}</div></div>
            <div v-else><div v-if="msg.error" class="text-red-500">{{msg.content}}</div><div v-else class="prose prose-xs max-w-none prose-p:my-0.5" v-html="rm(msg.content)"/><div v-if="msg.toolCalls?.length" class="flex gap-1 mt-0.5"><NTag v-for="tc in msg.toolCalls" :key="tc.name" size="tiny" :bordered="false">{{tl[tc.name]||tc.name}}</NTag></div></div>
          </template>
          <div v-if="streamingMsg"><div class="prose prose-xs max-w-none prose-p:my-0.5" v-html="rm(streamingMsg)"/><span v-if="!sDone" class="inline-block w-1 h-3 bg-[#555] animate-pulse ml-0.5 rounded-sm"/></div>
        </div>
        <div class="px-2 py-1.5 border-t border-[#eee] bg-white flex gap-1.5">
          <input v-model="aiInput" class="flex-1 border border-[#e5e5e5] rounded-full px-3 py-1 text-xs outline-none focus:border-[#999]" placeholder="发送消息..." @keydown.enter="sendAi()" :disabled="aiLoading"/>
          <NButton size="tiny" type="primary" @click="sendAi" :disabled="!aiInput.trim()||aiLoading" round>发送</NButton>
        </div>
      </div>
    </div>

    <!-- Version bar -->
    <div class="border-t border-[#e5e5e5] bg-white shrink-0">
      <div class="flex items-center h-8 px-3 border-b border-[#eee] bg-[#fafafa] gap-1 overflow-x-auto">
        <span class="text-[11px] text-[#999] mr-1 shrink-0 flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6h3l1-3 1 6 1-3h3" stroke="#999" stroke-width="1" fill="none"/></svg>版本</span>
        <button v-for="ver in versions" :key="ver.id" @click="selectVer(ver)" class="text-[11px] px-2 py-0.5 rounded border shrink-0 transition-colors" :class="selectedVer?.id===ver.id?'bg-white border-[#bbb] text-[#1a1a1a] font-semibold shadow-sm':'border-transparent text-[#888] hover:bg-black/[0.02] hover:text-[#555]'">v{{ver.num}}</button>
        <div class="flex-1"/>
        <NPopconfirm v-if="selectedVer" @positive-click="rollback"><template #trigger><NButton size="tiny" type="error" ghost>还原到 v{{selectedVer.num}}</NButton></template>确定还原？</NPopconfirm>
      </div>
    </div>
  </div>
</template>
