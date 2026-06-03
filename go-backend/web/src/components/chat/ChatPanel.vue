<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { NInput, NButton, NTag } from 'naive-ui'
import { api } from '../../api/client'
import { useSSE, type ToolCallState } from '../../composables/useSSE'
import { useNovelStore } from '../../stores/novel'
import { marked } from 'marked'

const props = defineProps<{ chapterId?: number; sessionId?: string }>()
const novelStore = useNovelStore()

const input = ref('')
const messages = ref<any[]>([])
const chatRef = ref<HTMLElement>()
const { toolCalls, isDone, connect, reset } = useSSE()
const streamingMsg = ref('')
const loadingHistory = ref(false)

// Load history if sessionId provided
onMounted(async () => {
  if (props.sessionId) {
    loadingHistory.value = true
    try {
      const data = await api.agent.messages(props.sessionId)
      messages.value = (data.messages || []).map((m: any) => ({
        ...m,
        toolCalls: m.metadata ? (() => {
          try { const meta = JSON.parse(m.metadata); return (meta.toolCalls || []).map((n: string) => ({ name: n, status: 'done' } as ToolCallState)) } catch { return [] }
        })() : []
      }))
    } catch (_) {}
    loadingHistory.value = false
    await nextTick()
    chatRef.value?.scrollTo({ top: chatRef.value.scrollHeight })
  }
})

async function send(overrideMsg?: string) {
  const msg = overrideMsg || input.value
  if (!msg.trim() || (!isDone.value && streamingMsg.value)) return
  messages.value.push({ role: 'user', content: msg })
  input.value = ''
  reset()
  streamingMsg.value = ''

  try {
    const resp = await api.agent.chat({
      messages: messages.value.map((m: any) => ({ role: m.role, content: m.content })),
      novelId: novelStore.currentNovelId,
      chapterId: props.chapterId,
      context: props.chapterId ? 'edit' : 'brainstorm',
      sessionId: props.sessionId,
    })
    if (!resp.ok) throw new Error('请求失败: ' + resp.status)

    await connect(resp, (chunk: string) => { streamingMsg.value += chunk })

    if (streamingMsg.value.trim()) {
      messages.value.push({
        role: 'assistant', content: streamingMsg.value,
        toolCalls: [...toolCalls.value],
      })
    }
    streamingMsg.value = ''
  } catch (e: any) {
    console.error('Chat error:', e)
    messages.value.push({ role: 'assistant', content: '错误: ' + e.message, error: true })
    streamingMsg.value = ''
  }

  await nextTick()
  chatRef.value?.scrollTo({ top: chatRef.value.scrollHeight, behavior: 'smooth' })
}

function renderMarkdown(text: string): string {
  try { return marked.parse(text) as string } catch { return text }
}

const toolLabels: Record<string, string> = {
  getChapter: '📖 获取章节', listChapters: '📋 章节列表', searchChapters: '🔍 搜索',
  saveChapter: '💾 保存', getStats: '📊 统计', getActiveStyle: '🎨 文风',
  getOutline: '📝 大纲', listCharacters: '👤 角色', listForeshadowing: '🪝 伏笔',
  searchMemory: '🧠 记忆', saveMemory: '💡 保存记忆',
  createStyleFromDescription: '✨ 创建文风', updateNovelConfig: '⚙ 配置',
  updateCharacter: '✏️ 更新角色',
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="loadingHistory" class="flex justify-center py-10"><div class="w-6 h-6 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
    <div v-else ref="chatRef" class="flex-1 overflow-auto px-3 py-2 space-y-2">
      <div v-if="messages.length === 0 && !streamingMsg" class="text-center py-8 text-xs text-[#999]">
        和 AI 聊聊你的想法
      </div>
      <template v-for="(msg, i) in messages" :key="i">
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[85%] bg-[#f0f0f0] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap">{{ msg.content }}</div>
        </div>
        <div v-else class="text-xs text-[#1a1a1a]">
          <div v-if="msg.error" class="text-red-500">{{ msg.content }}</div>
          <div v-else class="prose prose-xs max-w-none" v-html="renderMarkdown(msg.content)" />
          <div v-if="msg.toolCalls?.length" class="flex flex-wrap gap-1 mt-1">
            <NTag v-for="tc in msg.toolCalls" :key="tc.name" size="tiny" :type="tc.status==='error'?'error':tc.status==='done'?'success':'default'">{{ toolLabels[tc.name] || tc.name }}</NTag>
          </div>
        </div>
      </template>
      <div v-if="streamingMsg" class="text-xs text-[#1a1a1a]">
        <div class="prose prose-xs max-w-none" v-html="renderMarkdown(streamingMsg)" />
        <span v-if="!isDone" class="inline-block w-1.5 h-3.5 bg-[#171717] animate-pulse ml-0.5 align-middle" />
      </div>
      <div v-if="toolCalls.length" class="flex flex-wrap gap-1 mt-1">
        <NTag v-for="tc in toolCalls" :key="tc.name" size="tiny" :type="tc.status==='error'?'error':tc.status==='done'?'success':'default'">{{ toolLabels[tc.name] || tc.name }}</NTag>
      </div>
    </div>
    <div class="px-2 py-1.5 border-t border-[#e5e5e5] flex gap-1.5">
      <NInput v-model:value="input" placeholder="写点什么..." size="tiny" round @keydown.enter.exact="send()" :disabled="!isDone && streamingMsg !== ''" />
      <NButton size="tiny" type="primary" @click="send()" :disabled="!input.trim()">发送</NButton>
    </div>
  </div>
</template>
