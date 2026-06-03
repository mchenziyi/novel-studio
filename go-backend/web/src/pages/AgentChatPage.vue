<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NSelect, NPopconfirm } from 'naive-ui'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'

const novelStore = useNovelStore()
const sessions = ref<any[]>([])
const selectedSid = ref('')
const messages = ref<any[]>([])
const streamingMsg = ref('')
const streamDone = ref(true)
const aiInput = ref('')
const model = ref('')
const models = ref<{id:string;name:string}[]>([])
const contextType = ref<'write'|'edit'|'brainstorm'|'analyze'>('brainstorm')
const chapterId = ref<number|undefined>()
const chaptersList = ref<{id:string;title:string}[]>([])
const toolCalls = ref<any[]>([])
const loading = ref(true)
let abortCtrl: AbortController|null = null

// Diff popup
const showDiff = ref(false)
const diffTitle = ref('')
const diffLeft = ref('')
const diffRight = ref('')
const diffBlocks = ref<any[]>([])

onMounted(async () => {
  await Promise.all([loadModels(), loadChapters(), loadSessions()])
  loading.value = false
})

async function loadModels(){try{const m=await api.models.list();models.value=m.filter((x:any)=>x.enabled).map((x:any)=>({id:x.id,name:x.name}))}catch(_){}}
async function loadChapters(){try{chaptersList.value=await api.chapters.list(novelStore.currentNovelId)}catch(_){}}
async function loadSessions(){try{const d=await api.agent.sessions(novelStore.currentNovelId);sessions.value=d.sessions||[]}catch(_){}}

async function selectSession(sid:string){
  selectedSid.value=sid; loading.value=true
  try{const d=await api.agent.messages(sid);messages.value=(d.messages||[]).map((m:any)=>({...m,toolCalls:parseTC(m.metadata)}))}catch(_){messages.value=[]}
  loading.value=false
}

function parseTC(meta:string){try{const d=JSON.parse(meta);return(d.toolCalls||[]).map((n:string)=>({name:n,status:'done'}))}catch{return[]}}

function newSession(){selectedSid.value='';messages.value=[]}
async function deleteSession(sid:string){await api.agent.delete(sid);await loadSessions();if(selectedSid.value===sid)newSession()}

async function send(){
  const msg=aiInput.value;if(!msg.trim()||(!streamDone.value&&streamingMsg.value))return
  messages.value.push({role:'user',content:msg});aiInput.value=''
  streamDone.value=false;streamingMsg.value='';toolCalls.value=[]

  try{
    abortCtrl=new AbortController()
    const resp=await fetch('/api/agent/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      messages:messages.value.filter((m:any)=>!m._internal).map((m:any)=>({role:m.role,content:m.content})),
      novelId:novelStore.currentNovelId,chapterId:chapterId.value,modelId:model.value||undefined,
      context:contextType.value,sessionId:selectedSid.value||undefined,
    }),signal:abortCtrl.signal})
    if(!resp.ok)throw new Error('请求失败')
    const reader=resp.body!.getReader();const d=new TextDecoder();let buf=''
    while(true){const{value,done}=await reader.read();if(done)break;buf+=d.decode(value,{stream:true});for(const l of buf.split('\n')){buf='';if(!l.startsWith('data: '))continue;const dd=JSON.parse(l.slice(6));switch(dd.type){case'chunk':streamingMsg.value+=dd.text;break;case'tool_start':toolCalls.value.push({name:dd.toolName,status:'pending',input:dd.toolInput});break;case'tool_end':{const tc=toolCalls.value.find(t=>t.name===dd.toolName&&t.status==='pending');if(tc){tc.status='done';tc.output=dd.toolOutput};if(dd.toolName==='saveChapter')showDiffFromSave(dd.toolOutput)}break;case'error':console.error(dd.error);break;case'done':streamDone.value=true;break}}}
    if(streamingMsg.value.trim())messages.value.push({role:'assistant',content:streamingMsg.value,toolCalls:[...toolCalls.value]})
    streamingMsg.value='';streamDone.value=true
    if(!selectedSid.value)await loadSessions()
  }catch(e:any){if(e.name!=='AbortError'){messages.value.push({role:'assistant',content:'错误: '+e.message,error:true});streamingMsg.value=''};streamDone.value=true}
}

function stop(){abortCtrl?.abort();streamDone.value=true;streamingMsg.value=''}

function showDiffFromSave(output:string){
  try{const d=JSON.parse(output);if(d.chapterId){diffTitle.value=`第${d.chapterId}章`;diffLeft.value='';diffRight.value='';diffBlocks.value=[];showDiff.value=true}}catch{}
}

const toolLabels:Record<string,string>={getChapter:'读章节',saveChapter:'保存',getStats:'统计',getActiveStyle:'文风',getOutline:'大纲',listCharacters:'角色',listForeshadowing:'伏笔'}
</script>

<template>
  <div class="flex h-full">
    <!-- Sessions -->
    <div class="w-[260px] border-r border-[#e5e5e5] bg-[#fafafa] flex flex-col shrink-0">
      <div class="p-3 border-b border-[#e5e5e5] space-y-2">
        <NButton size="small" block @click="newSession">+ 新对话</NButton>
        <NSelect v-model:value="chapterId" size="tiny" :options="chaptersList.map((c:any)=>({label:`${c.id} ${c.title}`,value:parseInt(c.id)}))" placeholder="关联章节" clearable />
        <NSelect v-model:value="contextType" size="tiny" :options="[{label:'写',value:'write'},{label:'编辑',value:'edit'},{label:'头脑风暴',value:'brainstorm'},{label:'分析',value:'analyze'}]" />
        <NSelect v-model:value="model" size="tiny" :options="models.map((m:any)=>({label:m.name,value:m.id}))" placeholder="模型" clearable />
      </div>
      <div class="flex-1 overflow-auto">
        <div v-if="sessions.length===0" class="p-4 text-center text-xs text-[#999]">暂无对话</div>
        <div v-for="s in sessions" :key="s.id" class="group px-3 py-2 cursor-pointer text-sm hover:bg-black/[0.03] flex items-center justify-between"
          :class="selectedSid===s.id?'bg-black/[0.05]':''" @click="selectSession(s.id)">
          <div class="flex-1 min-w-0"><div class="truncate text-[#1a1a1a] text-[13px]">{{s.title||'新对话'}}</div><div class="text-[10px] text-[#999]">{{s.updatedAt?.slice(0,10)}}</div></div>
          <NPopconfirm @positive-click="()=>deleteSession(s.id)"><template #trigger><button class="opacity-0 group-hover:opacity-100 text-[#999] hover:text-red-500 text-xs shrink-0 ml-1">✕</button></template>确定删除？</NPopconfirm>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <div class="flex-1 min-w-0 flex flex-col bg-[#fafafa]">
      <div v-if="loading" class="flex-1 flex items-center justify-center"><div class="w-6 h-6 border-2 border-[#ddd] border-t-[#666] rounded-full animate-spin"/></div>
      <div v-else class="flex-1 overflow-auto px-4 py-3 space-y-3">
        <div v-if="messages.length===0&&!streamingMsg" class="text-center py-16 text-sm text-[#bbb] select-none">选择或开始新对话</div>
        <template v-for="(msg,i) in messages" :key="i">
          <div v-if="msg.role==='user'" class="flex justify-end"><div class="max-w-[80%] bg-[#e8e8e8] rounded-xl rounded-br-md px-3 py-2 text-[13px] whitespace-pre-wrap text-[#333]">{{msg.content}}</div></div>
          <div v-else class="text-[13px] text-[#333] leading-relaxed">
            <div v-if="msg.error" class="text-red-500">{{msg.content}}</div>
            <div v-else class="prose prose-sm max-w-none prose-p:my-1 prose-table:text-xs prose-headings:my-2" v-html="msg.content"/>
            <div v-if="msg.toolCalls?.length" class="flex flex-wrap gap-1 mt-1"><span v-for="tc in msg.toolCalls" :key="tc.name" class="text-[11px] px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#666]">{{toolLabels[tc.name]||tc.name}}</span></div>
          </div>
        </template>
        <div v-if="streamingMsg"><div class="prose prose-sm max-w-none prose-p:my-1" v-html="streamingMsg"/><span v-if="!streamDone" class="inline-block w-1 h-4 bg-[#555] animate-pulse ml-0.5 align-middle rounded-sm"/></div>
      </div>
      <div class="px-4 py-2.5 border-t border-[#eee] bg-white flex gap-2 items-center">
        <input v-model="aiInput" class="flex-1 border border-[#e5e5e5] rounded-full px-4 py-2 text-sm outline-none focus:border-[#999] transition-colors" placeholder="输入消息..." @keydown.enter="send()" :disabled="!streamDone"/>
        <NButton size="small" type="primary" @click="send" :disabled="!aiInput.trim()||!streamDone" round>发送</NButton>
        <NButton v-if="!streamDone" size="small" @click="stop" type="error" ghost round>停止</NButton>
      </div>
    </div>
  </div>
</template>
