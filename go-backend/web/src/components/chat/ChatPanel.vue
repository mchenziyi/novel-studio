<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { NInput, NButton, NTag } from 'naive-ui'
import { api } from '../../api/client'
import { useSSE } from '../../composables/useSSE'
import { useNovelStore } from '../../stores/novel'
import { marked } from 'marked'

const props = defineProps<{ chapterId?: number }>()
const novelStore = useNovelStore()

const input = ref('')
const messages = ref<any[]>([])
const chatRef = ref<HTMLElement>()
const { toolCalls, isDone, connect, reset } = useSSE()

// Current streaming message
const streamingMsg = ref('')
async function send(overrideMsg?: string) {
  const msg = overrideMsg || input.value
  if (!msg.trim()) return
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
    })
    if (!resp.ok) throw new Error('请求失败')

    await connect(resp, (chunk) => {
      streamingMsg.value += chunk
    })

    // Add final message
    if (streamingMsg.value) {
      messages.value.push({
        role: 'assistant',
        content: streamingMsg.value,
        toolCalls: toolCalls.value,
      })
    }
    streamingMsg.value = ''
  } catch (e: any) {
    messages.value.push({ role: 'assistant', content: `错误: ${e.message}`, error: true })
  }

  await nextTick()
  chatRef.value?.scrollTo({ top: chatRef.value.scrollHeight, behavior: 'smooth' })
}

function renderMarkdown(text: string): string {
  try { return marked.parse(text) as string } catch { return text }
}

const toolLabels: Record<string, string> = {
  getChapter: '📖 获取章节',
  listChapters: '📋 章节列表',
  searchChapters: '🔍 搜索章节',
  saveChapter: '💾 保存章节',
  getStats: '📊 查看统计',
  getActiveStyle: '🎨 获取文风',
  getOutline: '📝 获取大纲',
  listCharacters: '👤 角色列表',
  listForeshadowing: '🪝 伏笔列表',
  searchMemory: '🧠 搜索记忆',
  saveMemory: '💡 保存记忆',
  createStyleFromDescription: '✨ 创建文风',
  updateNovelConfig: '⚙ 更新配置',
  updateCharacter: '✏️ 更新角色',
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Messages -->
    <div ref="chatRef" class="flex-1 overflow-auto px-4 py-3 space-y-3">
      <div v-if="messages.length === 0 && !streamingMsg"
        class="text-center py-10 text-sm text-[#999]">
        和 AI 聊聊你的想法，写章节、审计、讨论角色都可以
      </div>

      <div v-for="(msg, i) in messages" :key="i">
        <!-- User -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[80%] bg-[#f0f0f0] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] whitespace-pre-wrap">
            {{ msg.content }}
          </div>
        </div>
        <!-- Assistant -->
        <div v-else class="text-sm text-[#1a1a1a]">
          <div v-if="msg.error" class="text-red-500">{{ msg.content }}</div>
          <div v-else class="prose prose-sm max-w-none" v-html="renderMarkdown(msg.content)" />
          <div v-if="msg.toolCalls?.length" class="flex flex-wrap gap-1 mt-1">
            <NTag v-for="tc in msg.toolCalls" :key="tc.name" size="tiny"
              :type="tc.status === 'error' ? 'error' : tc.status === 'done' ? 'success' : 'default'"
            >{{ toolLabels[tc.name] || tc.name }}</NTag>
          </div>
        </div>
      </div>

      <!-- Streaming -->
      <div v-if="streamingMsg" class="text-sm text-[#1a1a1a]">
        <div class="prose prose-sm max-w-none" v-html="renderMarkdown(streamingMsg)" />
        <span v-if="!isDone" class="inline-block w-2 h-4 bg-[#171717] animate-pulse ml-0.5 align-middle" />
      </div>

      <!-- Tool calls during streaming -->
      <div v-if="toolCalls.length" class="flex flex-wrap gap-1">
        <NTag v-for="tc in toolCalls" :key="tc.name" size="tiny"
          :type="tc.status === 'error' ? 'error' : tc.status === 'done' ? 'success' : 'default'"
        >{{ toolLabels[tc.name] || tc.name }}</NTag>
      </div>
    </div>

    <!-- Input -->
    <div class="px-3 py-2 border-t border-[#e5e5e5] flex gap-2">
      <NInput
        v-model:value="input"
        placeholder="输入消息..."
        size="small"
        @keydown.enter.exact="send()"
        :disabled="!isDone && streamingMsg !== ''"
      />
      <NButton size="small" type="primary" @click="send()" :disabled="!input.trim()">发送</NButton>
    </div>
  </div>
</template>
