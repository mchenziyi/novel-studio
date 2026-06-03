<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NDropdown, NPopconfirm } from 'naive-ui'
import { api } from '../api/client'
import ChatPanel from '../components/chat/ChatPanel.vue'

const route = useRoute()
const router = useRouter()

const chapter = ref<any>({})
const content = ref('')
const wordCount = ref(0)
const saving = ref(false)
const loading = ref(true)

// Version diff state
const versions = ref<any[]>([])
const selectedVersion = ref<any>(null)
const diffLeft = ref('')
const diffRight = ref('')
const diffBlocks = ref<any[]>([])
const showDiff = ref(false)

// Refs for synced scroll
const leftPanel = ref<HTMLElement>()
const rightPanel = ref<HTMLElement>()
let isSyncing = false

async function loadChapter() {
  try {
    chapter.value = await api.chapters.get(route.params.id as string)
    content.value = chapter.value.content || ''
    wordCount.value = chapter.value.wordCount || 0
    await loadVersions()
  } catch (e) {
    // New chapter
    chapter.value = { id: route.params.id, title: `第${parseInt(route.params.id as string)}章`, wordCount: 0 }
    content.value = ''
  }
  loading.value = false
}

async function loadVersions() {
  try { versions.value = await api.chapters.history(route.params.id as string) } catch (_) {}
}

async function save() {
  saving.value = true
  try {
    wordCount.value = [...content.value].length
    await api.chapters.update(route.params.id as string, { content: content.value })
  } catch (_) {}
  saving.value = false
  await loadVersions()
}

async function selectVersion(ver: any) {
  selectedVersion.value = ver
  try {
    const result = await api.chapters.diff(route.params.id as string, ver.id)
    diffLeft.value = result.left
    diffRight.value = result.right
    diffBlocks.value = result.diff || []
    showDiff.value = true
  } catch (_) {}
}

function closeDiff() {
  showDiff.value = false
  selectedVersion.value = null
}

async function rollback() {
  if (!selectedVersion.value) return
  await api.chapters.rollback(route.params.id as string, selectedVersion.value.id)
  closeDiff()
  loading.value = true
  location.reload()
}

function onLeftScroll() {
  if (isSyncing || !rightPanel.value) return
  isSyncing = true
  rightPanel.value.scrollTop = leftPanel.value!.scrollTop
  requestAnimationFrame(() => { isSyncing = false })
}

function onRightScroll() {
  if (isSyncing || !leftPanel.value) return
  isSyncing = true
  leftPanel.value.scrollTop = rightPanel.value!.scrollTop
  requestAnimationFrame(() => { isSyncing = false })
}

function getLineStyle(blockType: string, side: 'left' | 'right'): string {
  if (blockType === 'equal') return ''
  if (side === 'left' && blockType === 'delete') return 'bg-red-50'
  if (side === 'right' && blockType === 'insert') return 'bg-green-50'
  return ''
}

// Ctrl+S shortcut
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    save()
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  await loadChapter()
})

watch(() => route.params.id, loadChapter)

// Watch content for word count
watch(content, (v) => { wordCount.value = [...v].length })
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" />
  </div>

  <div v-else class="flex flex-col h-full">
    <!-- Top Bar -->
    <div class="flex items-center h-12 px-4 border-b border-[#e5e5e5] bg-white shrink-0 gap-3">
      <button @click="router.back()" class="text-[#666] hover:text-[#1a1a1a] text-sm">← 返回</button>
      <span class="text-sm font-medium text-[#1a1a1a]">{{ chapter.id }} · {{ chapter.title }}</span>
      <span class="text-xs text-[#999]">{{ wordCount }}字</span>
      <div class="flex-1" />
      <NDropdown trigger="click" :options="versions.map((v) => ({
        label: `${v.id} · ${v.source}`,
        key: v.id,
        props: { onClick: () => selectVersion(v) }
      }))">
        <NButton size="tiny" :disabled="versions.length === 0">版本 ▾</NButton>
      </NDropdown>
      <NButton size="tiny" type="primary" @click="save" :loading="saving" :disabled="!showDiff">保存</NButton>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- Diff Mode -->
      <div v-if="showDiff" class="flex-1 flex min-h-0">
        <!-- Left: selected version -->
        <div class="w-1/2 border-r border-[#e5e5e5] flex flex-col">
          <div class="h-8 px-3 flex items-center text-xs text-[#666] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0">
            ← {{ selectedVersion?.id }} · {{ selectedVersion?.source }}
          </div>
          <div ref="leftPanel" class="flex-1 overflow-auto font-mono text-sm leading-6 p-3 bg-white"
            @scroll="onLeftScroll"
          >
            <div v-for="(block, bi) in diffBlocks" :key="'l'+bi">
              <div v-if="block.type !== 'insert'"
                v-for="(line, li) in diffLeft.split('\n').slice(block.leftLines[0], block.leftLines[1] + 1)"
                :key="'ll'+bi+'-'+li"
                :class="['px-2', getLineStyle(block.type, 'left')]"
              >{{ line || ' ' }}</div>
            </div>
          </div>
          <div class="h-10 px-3 flex items-center border-t border-[#e5e5e5] bg-[#fafafa] shrink-0">
            <NPopconfirm @positive-click="rollback">
              <template #trigger><NButton size="tiny" type="error" ghost>还原到此版本</NButton></template>
              确定还原到 {{ selectedVersion?.id }}？当前内容将被覆盖。
            </NPopconfirm>
            <div class="flex-1" />
            <NButton size="tiny" @click="closeDiff">✕ 关闭对比</NButton>
          </div>
        </div>

        <!-- Right: current version -->
        <div class="w-1/2 flex flex-col">
          <div class="h-8 px-3 flex items-center text-xs text-[#666] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0">
            v当前 · 最新
          </div>
          <div ref="rightPanel" class="flex-1 overflow-auto font-mono text-sm leading-6 p-3 bg-white"
            @scroll="onRightScroll"
          >
            <div v-for="(block, bi) in diffBlocks" :key="'r'+bi">
              <div v-if="block.type !== 'delete'"
                v-for="(line, li) in diffRight.split('\n').slice(block.rightLines[0], block.rightLines[1] + 1)"
                :key="'rl'+bi+'-'+li"
                :class="['px-2', getLineStyle(block.type, 'right')]"
              >{{ line || ' ' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Editor Mode -->
      <div v-else class="flex-1 overflow-auto p-4">
        <textarea
          v-model="content"
          class="w-full h-full min-h-[500px] resize-none border-0 outline-none text-sm leading-7 font-serif text-[#1a1a1a] bg-transparent p-0"
          placeholder="开始写作..."
          spellcheck="false"
        />
      </div>

      <!-- Chat Panel -->
      <div class="h-[240px] border-t border-[#e5e5e5] bg-white shrink-0">
        <ChatPanel :chapter-id="parseInt(route.params.id as string)" />
      </div>
    </div>
  </div>
</template>
