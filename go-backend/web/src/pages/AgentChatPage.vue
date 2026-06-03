<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../api/client'
import { useNovelStore } from '../stores/novel'
import ChatPanel from '../components/chat/ChatPanel.vue'
import { NButton } from 'naive-ui'

const novelStore = useNovelStore()
const sessions = ref<any[]>([])
const selectedSession = ref<string>('')
const loadingHistory = ref(false)
const historyMessages = ref<any[]>([])

onMounted(async () => {
  try {
    const data = await api.agent.sessions(novelStore.currentNovelId)
    sessions.value = data.sessions || []
  } catch (_) {}
})

async function selectSession(sid: string) {
  selectedSession.value = sid
  loadingHistory.value = true
  try {
    const data = await api.agent.messages(sid)
    historyMessages.value = data.messages || []
  } catch (_) {}
  loadingHistory.value = false
}

async function newSession() {
  selectedSession.value = ''
  historyMessages.value = []
}
</script>

<template>
  <div class="flex h-full">
    <!-- Session List -->
    <div class="w-[260px] border-r border-[#e5e5e5] bg-[#fafafa] flex flex-col shrink-0">
      <div class="p-3 border-b border-[#e5e5e5]">
        <NButton size="small" block @click="newSession">+ 新对话</NButton>
      </div>
      <div class="flex-1 overflow-auto">
        <div v-if="sessions.length === 0" class="p-4 text-center text-sm text-[#999]">暂无对话</div>
        <div v-for="s in sessions" :key="s.id"
          class="px-3 py-2 cursor-pointer text-sm hover:bg-black/[0.03]"
          :class="selectedSession === s.id ? 'bg-black/[0.05]' : ''"
          @click="selectSession(s.id)"
        >
          <div class="truncate text-[#1a1a1a]">{{ s.title }}</div>
          <div class="text-xs text-[#999] mt-0.5">{{ s.updatedAt?.slice(0,10) }}</div>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="flex-1 min-h-0" v-if="!selectedSession">
        <div class="flex items-center justify-center h-full text-sm text-[#999]">
          选择对话或开始新对话
        </div>
      </div>

      <div v-else-if="loadingHistory" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
      </div>

      <ChatPanel v-else />
    </div>
  </div>
</template>
