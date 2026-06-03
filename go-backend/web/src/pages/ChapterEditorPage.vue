<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NPopconfirm } from 'naive-ui'
import { api } from '../api/client'
import ChatPanel from '../components/chat/ChatPanel.vue'

const route = useRoute()
const router = useRouter()

const chapter = ref<any>({})
const content = ref('')
const wordCount = ref(0)
const saving = ref(false)
const loading = ref(true)

// Version state
type VerItem = { id: string; source: string; timestamp: string; description: string; num: number }
const versions = ref<VerItem[]>([])
const selectedVersion = ref<VerItem | null>(null)
const prevContent = ref('')
const diffBlocks = ref<any[]>([])

// Sync scroll refs (both vertical and horizontal)
const leftScroll = ref<HTMLElement>()
const rightScroll = ref<HTMLElement>()
let syncingV = false
let syncingH = false

async function loadChapter() {
  try {
    chapter.value = await api.chapters.get(route.params.id as string)
    content.value = chapter.value.content || ''
    wordCount.value = chapter.value.wordCount || 0
    await loadVersions()
  } catch (_) {
    chapter.value = { id: route.params.id, title: `第${parseInt(route.params.id as string)}章` }
    content.value = ''
  }
  loading.value = false
}

async function loadVersions() {
  try {
    const raw = await api.chapters.history(route.params.id as string)
    versions.value = raw.map((v: any, i: number) => ({
      ...v, num: raw.length - i
    }))
    // Auto-select latest previous version for diff
    if (versions.value.length >= 2) {
      selectVersion(versions.value[1]) // v[n-1]
    }
  } catch (_) {}
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    wordCount.value = [...content.value].length
    const updateData = chapter.value.id ? { content: content.value } : {
      novelId: 'default',
      title: chapter.value.title || `第${parseInt(route.params.id as string)}章`,
      content: content.value,
      number: parseInt(route.params.id as string),
      file: `${route.params.id as string}.md`
    }
    if (chapter.value.id) {
      await api.chapters.update(route.params.id as string, updateData)
    } else {
      await api.chapters.create(updateData)
    }
    await loadVersions()
  } catch (_) {}
  saving.value = false
}

async function selectVersion(ver: VerItem) {
  selectedVersion.value = ver
  try {
    // Get diff between selected version (left) and current editor (right)
    const result = await api.chapters.diff(route.params.id as string, ver.id, 'current')
    prevContent.value = result.left
    diffBlocks.value = result.diff || []
  } catch (_) {
    prevContent.value = '无法加载版本内容'
    diffBlocks.value = []
  }
}

async function rollback() {
  if (!selectedVersion.value) return
  await api.chapters.rollback(route.params.id as string, selectedVersion.value.id)
  selectedVersion.value = null
  content.value = prevContent.value
  wordCount.value = [...prevContent.value].length
  await loadVersions()
}

// Synced vertical scroll
function syncV(source: 'left' | 'right') {
  if (syncingV) return
  syncingV = true
  if (source === 'left' && rightScroll.value) {
    rightScroll.value.scrollTop = leftScroll.value!.scrollTop
  } else if (source === 'right' && leftScroll.value) {
    leftScroll.value.scrollTop = rightScroll.value!.scrollTop
  }
  requestAnimationFrame(() => { syncingV = false })
}

// Synced horizontal scroll
function syncH(source: 'left' | 'right') {
  if (syncingH) return
  syncingH = true
  if (source === 'left' && rightScroll.value) {
    rightScroll.value.scrollLeft = leftScroll.value!.scrollLeft
  } else if (source === 'right' && leftScroll.value) {
    leftScroll.value.scrollLeft = rightScroll.value!.scrollLeft
  }
  requestAnimationFrame(() => { syncingH = false })
}

function lineStyle(blockType: string, side: 'left' | 'right'): string {
  if (blockType === 'delete' && side === 'left') return 'bg-red-100'
  if (blockType === 'insert' && side === 'right') return 'bg-green-100'
  return ''
}

// Compute left line numbers
const leftLines = computed(() => {
  const lines = prevContent.value.split('\n')
  return lines
})

// Compute right line numbers  
const rightLines = computed(() => content.value.split('\n'))

// Ctrl+S
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault(); save()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  await loadChapter()
})

watch(() => route.params.id, loadChapter)
watch(content, (v) => { wordCount.value = [...v].length })
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
  </div>

  <div v-else class="flex flex-col h-full">
    <!-- Top Bar -->
    <div class="flex items-center h-11 px-3 border-b border-[#e5e5e5] bg-white shrink-0 gap-2 text-sm">
      <button @click="router.back()" class="text-[#666] hover:text-[#1a1a1a]">←</button>
      <span class="font-medium text-[#1a1a1a]">{{ chapter.id }}</span>
      <span class="text-[#666]">{{ chapter.title }}</span>
      <span class="text-xs text-[#999] ml-1">{{ wordCount }}字</span>
      <div class="flex-1" />
      <span v-if="selectedVersion" class="text-xs text-[#999]">
        对比: v{{ selectedVersion.num }}
        <button @click="selectedVersion = null; prevContent = ''; diffBlocks = []" class="ml-1 text-[#666] hover:text-[#1a1a1a]">✕</button>
      </span>
      <NButton size="tiny" @click="save" :loading="saving" :disabled="!content">保存</NButton>
    </div>

    <!-- Diff/Editor area -->
    <div class="flex-1 flex min-h-0">
      <!-- Left: previous version or editor -->
      <div class="w-1/2 border-r border-[#e5e5e5] flex flex-col">
        <div class="h-7 px-3 flex items-center text-xs text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono">
          <span v-if="selectedVersion">← v{{ selectedVersion.num }} · {{ selectedVersion.source }} · {{ selectedVersion.timestamp?.slice(0,10) }}</span>
          <span v-else>编辑区</span>
          <span class="ml-auto">{{ prevContent ? leftLines.length + ' 行' : '' }}</span>
        </div>
        <div 
          v-if="selectedVersion"
          ref="leftScroll" 
          class="flex-1 overflow-auto font-mono text-sm bg-white" 
          @scroll="syncV('left'); syncH('left')"
        >
          <table class="w-max min-w-full">
            <tbody>
              <template v-for="(block, bi) in diffBlocks" :key="'l'+bi">
                <template v-if="block.type !== 'insert'">
                  <tr v-for="li in (block.leftLines[1] - block.leftLines[0] + 1)" :key="'ll'+bi+'-'+li"
                    :class="lineStyle(block.type, 'left')"
                  >
                    <td class="text-xs text-[#bbb] text-right pr-2 pl-1 select-none w-10 leading-6 align-top">
                      {{ block.leftLines[0] + li }}
                    </td>
                    <td class="pr-2 leading-6 whitespace-pre-wrap break-all">
                      {{ (leftLines[block.leftLines[0] + li - 1] || ' ') }}
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
        <textarea
          v-else
          v-model="content"
          class="flex-1 resize-none border-0 outline-none text-sm leading-6 font-serif text-[#1a1a1a] bg-transparent p-3"
          placeholder="开始写作..."
          spellcheck="false"
        />
      </div>

      <!-- Right: current editor -->
      <div class="w-1/2 flex flex-col">
        <div class="h-7 px-3 flex items-center text-xs text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono">
          <span>当前版本</span>
          <span class="ml-auto">{{ rightLines.length }} 行</span>
        </div>
        <div 
          v-if="selectedVersion"
          ref="rightScroll"
          class="flex-1 overflow-auto font-mono text-sm bg-white" 
          @scroll="syncV('right'); syncH('right')"
        >
          <table class="w-max min-w-full">
            <tbody>
              <template v-for="(block, bi) in diffBlocks" :key="'r'+bi">
                <template v-if="block.type !== 'delete'">
                  <tr v-for="ri in (block.rightLines[1] - block.rightLines[0] + 1)" :key="'rl'+bi+'-'+ri"
                    :class="lineStyle(block.type, 'right')"
                  >
                    <td class="text-xs text-[#bbb] text-right pr-2 pl-1 select-none w-10 leading-6 align-top">
                      {{ block.rightLines[0] + ri }}
                    </td>
                    <td class="pr-2 leading-6 whitespace-pre-wrap break-all">
                      {{ rightLines[block.rightLines[0] + ri - 1] || ' ' }}
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
        <textarea
          v-else
          v-model="content"
          class="flex-1 resize-none border-l-0 border-0 outline-none text-sm leading-6 font-serif text-[#1a1a1a] bg-transparent p-3"
          placeholder="开始写作..."
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Bottom: Version list + Rollback + Chat -->
    <div class="border-t border-[#e5e5e5] bg-white shrink-0">
      <!-- Version bar -->
      <div class="flex items-center h-8 px-3 border-b border-[#e5e5e5] bg-[#fafafa] gap-1 overflow-x-auto">
        <span class="text-xs text-[#999] mr-1">历史版本:</span>
        <button v-for="ver in versions" :key="ver.id"
          @click="selectVersion(ver)"
          class="text-xs px-1.5 py-0.5 rounded border hover:bg-white shrink-0"
          :class="selectedVersion?.id === ver.id ? 'bg-white border-[#999] text-[#1a1a1a] font-medium' : 'border-transparent text-[#666]'"
        >
          v{{ ver.num }}
        </button>
        <div class="flex-1" />
        <NPopconfirm v-if="selectedVersion" @positive-click="rollback">
          <template #trigger><NButton size="tiny" type="error" ghost>还原到 v{{ selectedVersion.num }}</NButton></template>
          确定还原？当前内容将被覆盖。
        </NPopconfirm>
      </div>

      <!-- Chat -->
      <div class="h-[200px]">
        <ChatPanel :chapter-id="parseInt(route.params.id as string)" />
      </div>
    </div>
  </div>
</template>
