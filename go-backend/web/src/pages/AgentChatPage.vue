<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'
import ChatPanel from '../components/chat/ChatPanel.vue'
import { NButton } from 'naive-ui'

const novelStore = useNovelStore()
const sessions = ref<any[]>([])
const selectedSession = ref<string>('')

onMounted(async () => {
  try { const data = await api.agent.sessions(novelStore.currentNovelId); sessions.value = data.sessions || [] } catch (_) {}
})

function newSession() { selectedSession.value = '' }
</script>

<template>
  <div class="flex h-full">
    <div class="w-[260px] border-r border-[#e5e5e5] bg-[#fafafa] flex flex-col shrink-0">
      <div class="p-3 border-b border-[#e5e5e5]"><NButton size="small" block @click="newSession">+ 新对话</NButton></div>
      <div class="flex-1 overflow-auto">
        <div v-if="sessions.length === 0" class="p-4 text-center text-sm text-[#999]">暂无对话</div>
        <div v-for="s in sessions" :key="s.id" class="px-3 py-2 cursor-pointer text-sm hover:bg-black/[0.03]" :class="selectedSession === s.id?'bg-black/[0.05]':''" @click="selectedSession = s.id">
          <div class="truncate text-[#1a1a1a]">{{ s.title || '新对话' }}</div>
          <div class="text-xs text-[#999]">{{ s.updatedAt?.slice(0,10) }}</div>
        </div>
      </div>
    </div>
    <div class="flex-1 min-w-0">
      <ChatPanel :session-id="selectedSession || undefined" />
    </div>
  </div>
</template>
