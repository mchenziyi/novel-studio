<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { NInput, NButton, NTag } from 'naive-ui'
import { api } from '../../api/client'
import { useSSE } from '../../composables/useSSE'
import { useNovelStore } from '../../stores/novel'
import { marked } from 'marked'

const props = defineProps<{ chapterId?: number; sessionId?: string }>()
const novelStore = useNovelStore()

const inputMsg = ref('')
const messages = ref<any[]>([])
const chatRef = ref<HTMLElement>()
const { toolCalls, isDone, connect, reset } = useSSE()
const streamingMsg = ref('')
const loadingHistory = ref(false)
const currentSessionId = ref('')

// Load history on mount + watch sessionId
async function loadHistory() {
  if (!props.sessionId && !currentSessionId.value) return
  const sid = props.sessionId || currentSessionId.value
  if (!sid) return
  loadingHistory.value = true
  try {
    const data = await api.agent.messages(sid)
    messages.value = (data.messages || []).map((m: any) => ({
      ...m,
      toolCalls: m.metadata ? parseToolCalls(m.metadata) : []
    }))
  } catch (_) { messages.value = [] }
  loadingHistory.value = false
  await nextTick()
  scrollBottom()
}

function parseToolCalls(meta: string): any[] {
  try {
    const d = JSON.parse(meta)
    return (d.toolCalls || []).map((n: string) => ({ name: n, status: 'done' }))
  } catch { return [] }
}

onMounted(() => loadHistory())
watch(() => props.sessionId, () => { messages.value = []; currentSessionId.value = ''; loadHistory() })

function scrollBottom() { chatRef.value?.scrollTo({ top: chatRef.value.scrollHeight, behavior: 'smooth' }) }

async function send() {
  const msg = inputMsg.value
  if (!msg.trim() || (!isDone.value && streamingMsg.value)) return
  messages.value.push({ role: 'user', content: msg })
  inputMsg.value = ''
  reset()
  streamingMsg.value = ''

  try {
    const resp = await api.agent.chat({
      messages: messages.value.filter((m: any) => !m._internal).map((m: any) => ({ role: m.role, content: m.content })),
      novelId: novelStore.currentNovelId,
      chapterId: props.chapterId,
      context: props.chapterId ? 'edit' : 'brainstorm',
      sessionId: props.sessionId || currentSessionId.value || undefined,
    })
    if (!resp.ok) throw new Error('请求失败')
    await connect(resp, (chunk: string) => { streamingMsg.value += chunk })
    if (streamingMsg.value.trim()) {
      const finalMsg: any = { role: 'assistant', content: streamingMsg.value, toolCalls: [...toolCalls.value] }
      messages.value.push(finalMsg)
      // Remember session
      if (!currentSessionId.value && props.sessionId) currentSessionId.value = props.sessionId
    }
    streamingMsg.value = ''
  } catch (e: any) {
    messages.value.push({ role: 'assistant', content: '错误: ' + e.message, error: true })
    streamingMsg.value = ''
  }
  await nextTick(); scrollBottom()
}

function renderMarkdown(text: string): string { try { return marked.parse(text) as string } catch { return text } }

const toolLabels: Record<string, string> = {
  getChapter: '读章节', listChapters: '列表', searchChapters: '搜索',
  saveChapter: '保存', getStats: '统计', getActiveStyle: '文风',
  getOutline: '大纲', listCharacters: '角色', listForeshadowing: '伏笔',
  searchMemory: '记忆', saveMemory: '记忆',
  createStyleFromDescription: '文风', updateNovelConfig: '写作规范',
  updateCharacter: '角色',
}
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <div v-if="loadingHistory" class="flex-1 flex items-center justify-center"><div class="w-5 h-5 border-2 border-[#ddd] border-t-[#666] rounded-full animate-spin" /></div>
    <div v-else ref="chatRef" class="flex-1 overflow-auto px-3 py-2 space-y-2 bg-[#fafafa]">
      <div v-if="messages.length === 0 && !streamingMsg" class="text-center py-10 text-xs text-[#aaa] select-none">和 AI 沟通你的想法</div>
      <template v-for="(msg, i) in messages" :key="i">
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[88%] bg-[#e8e8e8] rounded-xl rounded-br-md px-3 py-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-[#333]">{{ msg.content }}</div>
        </div>
        <div v-else class="text-[13px] text-[#333] leading-relaxed">
          <div v-if="msg.error" class="text-red-500 text-xs">{{ msg.content }}</div>
          <div v-else class="prose prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1 prose-table:text-xs" v-html="renderMarkdown(msg.content)" />
          <div v-if="msg.toolCalls?.length" class="flex flex-wrap gap-1 mt-1">
            <NTag v-for="tc in msg.toolCalls" :key="tc.name" size="tiny" :type="tc.status==='error'?'error':'default'" :bordered="false">{{ toolLabels[tc.name] || tc.name }}</NTag>
          </div>
        </div>
      </template>
      <div v-if="streamingMsg" class="text-[13px] text-[#333] leading-relaxed">
        <div class="prose prose-sm max-w-none prose-p:my-0.5" v-html="renderMarkdown(streamingMsg)" />
        <span v-if="!isDone" class="inline-block w-1 h-4 bg-[#555] animate-pulse ml-0.5 align-middle rounded-sm" />
      </div>
      <div v-if="toolCalls.length && !streamingMsg" class="flex flex-wrap gap-1">
        <NTag v-for="tc in toolCalls" :key="tc.name" size="tiny" :type="tc.status==='error'?'error':'default'" :bordered="false">{{ toolLabels[tc.name] || tc.name }}</NTag>
      </div>
    </div>
    <div class="px-2.5 py-2 border-t border-[#eee] bg-white flex gap-2 items-center">
      <NInput v-model:value="inputMsg" placeholder="输入消息..." size="tiny" round @keydown.enter.exact="send()" :disabled="!isDone && streamingMsg!==''" class="flex-1" />
      <NButton size="tiny" type="primary" @click="send()" :disabled="!inputMsg.trim()" round>发送</NButton>
    </div>
  </div>
</template>
