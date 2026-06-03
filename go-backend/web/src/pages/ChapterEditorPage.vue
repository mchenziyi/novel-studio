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

interface VerItem { id: string; source: string; timestamp: string; description: string; num: number }
const versions = ref<VerItem[]>([])
const selectedVersion = ref<VerItem | null>(null)
const prevContent = ref('')
const diffBlocks = ref<any[]>([])

const leftScroll = ref<HTMLElement>()
const rightScroll = ref<HTMLElement>()
let vSyncing = false

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
    versions.value = raw.map((v: any, i: number) => ({ ...v, num: raw.length - i }))
    if (versions.value.length >= 2) selectVersion(versions.value[1])
  } catch (_) {}
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    wordCount.value = [...content.value].length
    if (chapter.value.id) {
      await api.chapters.update(route.params.id as string, { content: content.value })
    } else {
      await api.chapters.create({ novelId: 'default', title: chapter.value.title, content: content.value, number: parseInt(route.params.id as string), file: `${route.params.id as string}.md` })
    }
    await loadVersions()
  } catch (_) {}
  saving.value = false
}

async function selectVersion(ver: VerItem) {
  selectedVersion.value = ver
  try {
    const result = await api.chapters.diff(route.params.id as string, ver.id, 'current')
    prevContent.value = result.left
    diffBlocks.value = result.diff || []
  } catch (_) { prevContent.value = '无法加载'; diffBlocks.value = [] }
}

async function rollback() {
  if (!selectedVersion.value) return
  await api.chapters.rollback(route.params.id as string, selectedVersion.value.id)
  selectedVersion.value = null
  content.value = prevContent.value
  wordCount.value = [...prevContent.value].length
  await loadVersions()
}

// Sync scroll (both vertical and horizontal)
function onLeftScroll() {
  if (vSyncing || !rightScroll.value) return; vSyncing = true
  rightScroll.value.scrollTop = leftScroll.value!.scrollTop
  rightScroll.value.scrollLeft = leftScroll.value!.scrollLeft
  requestAnimationFrame(() => { vSyncing = false })
}
function onRightScroll() {
  if (vSyncing || !leftScroll.value) return; vSyncing = true
  leftScroll.value.scrollTop = rightScroll.value!.scrollTop
  leftScroll.value.scrollLeft = rightScroll.value!.scrollLeft
  requestAnimationFrame(() => { vSyncing = false })
}

const leftLines = computed(() => prevContent.value.split('\n'))
const rightLines = computed(() => content.value.split('\n'))

// Render a line with character-level diff highlights
function renderDiffLine(text: string, blockType: string, side: 'left' | 'right', charDiff?: any, lineOffset?: number): string {
  if (blockType === 'equal') return escapeHtml(text || ' ')
  if (!charDiff) return escapeHtml(text || ' ')
  const otherSide = side === 'left' ? 'delete' : 'insert'
  if (blockType !== otherSide) return escapeHtml(text || ' ')

  const runes = [...text]
  const { prefixLen, suffixLen, oldLen, newLen } = charDiff
  const lineId = side === 'left' ? charDiff.oldLine : charDiff.newLine
  if (lineId !== lineOffset) return escapeHtml(text || ' ')

  const prefix = runes.slice(0, prefixLen).join('')
  const middleRunes = runes.slice(prefixLen, (side === 'left' ? oldLen : newLen) - suffixLen)
  const middle = middleRunes.join('')
  const suffix = runes.slice((side === 'left' ? oldLen : newLen) - suffixLen).join('')

  const hlColor = side === 'left' ? '#fca5a5' : '#86efac'
  return escapeHtml(prefix) + `<span style="background:${hlColor}">` + escapeHtml(middle) + '</span>' + escapeHtml(suffix)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function lineClass(blockType: string, side: 'left' | 'right'): string {
  if (blockType === 'delete' && side === 'left') return 'bg-red-50/80'
  if (blockType === 'insert' && side === 'right') return 'bg-green-50/80'
  return ''
}

function charDiffsForBlock(block: any): any[] { return block.charDiffs || [] }

function onKeydown(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save() } }

onMounted(async () => { document.addEventListener('keydown', onKeydown); await loadChapter() })
watch(() => route.params.id, loadChapter)
watch(content, (v) => { wordCount.value = [...v].length })
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-[#d4d4d4] border-t-[#171717] rounded-full animate-spin" /></div>
  <div v-else class="flex flex-col h-full bg-[#fafafa]">
    <!-- Top Bar -->
    <div class="flex items-center h-10 px-4 border-b border-[#e5e5e5] bg-white shrink-0 gap-3 shadow-sm z-10">
      <button @click="router.back()" class="text-[#666] hover:text-[#1a1a1a] transition-colors text-sm flex items-center gap-1">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
        返回
      </button>
      <span class="font-semibold text-[#1a1a1a] text-sm">{{ chapter.id }}</span>
      <span class="text-[#666] text-sm truncate max-w-[200px]">{{ chapter.title }}</span>
      <span class="text-xs text-[#999] bg-[#f5f5f5] px-1.5 py-0.5 rounded">{{ wordCount }}字</span>
      <div class="flex-1" />
      <span v-if="selectedVersion" class="text-xs text-[#999] flex items-center gap-1">
        对比 v{{ selectedVersion.num }}
        <button @click="selectedVersion = null; prevContent = ''; diffBlocks = []" class="hover:text-[#1a1a1a]">✕</button>
      </span>
      <NButton size="tiny" @click="save" :loading="saving">保存</NButton>
    </div>

    <!-- Editor/Diff panels -->
    <div class="flex-1 flex min-h-0 bg-white">
      <!-- Left: diff or editor -->
      <div class="flex-1 border-r border-[#e5e5e5] flex flex-col relative">
        <div class="h-7 px-3 flex items-center text-xs text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#fca5a5"/></svg>
          <span v-if="selectedVersion">v{{ selectedVersion.num }} · {{ selectedVersion.source }}</span>
          <span v-else>编辑区</span>
          <span class="ml-auto">{{ prevContent ? leftLines.length + '行' : '' }}</span>
        </div>
        <div v-if="selectedVersion" ref="leftScroll" class="flex-1 overflow-auto font-mono text-sm bg-[#fefefe]" @scroll="onLeftScroll">
          <table class="w-max min-w-full table-fixed border-collapse">
            <colgroup><col style="width:40px"><col></colgroup>
            <tbody>
              <template v-for="(block, bi) in diffBlocks" :key="'l'+bi">
                <template v-if="block.type !== 'insert'">
                  <tr v-for="li in (block.leftLines[1] - block.leftLines[0] + 1)" :key="'ll'+bi+'-'+li" :class="lineClass(block.type, 'left')">
                    <td class="text-[11px] text-[#ccc] text-right pr-1.5 select-none align-top pt-px font-mono leading-5 border-r border-[#f0f0f0]">
                      {{ block.leftLines[0] + li }}
                    </td>
                    <td class="pl-2 pr-2 whitespace-pre-wrap break-all leading-5 text-[13px]"
                      v-html="renderDiffLine(leftLines[block.leftLines[0]+li-1]||' ', block.type, 'left', charDiffsForBlock(block).find((cd:any) => cd.oldLine === li-1), li-1)" />
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
        <textarea v-else v-model="content" class="flex-1 resize-none border-0 outline-none text-sm leading-6 text-[#1a1a1a] bg-transparent p-4 font-serif placeholder:text-[#ccc]" placeholder="开始写作..." spellcheck="false" />
      </div>

      <!-- Right: editor or diff -->
      <div class="flex-1 flex flex-col relative">
        <div class="h-7 px-3 flex items-center text-xs text-[#999] bg-[#fafafa] border-b border-[#e5e5e5] shrink-0 font-mono gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#86efac"/></svg>
          <span>当前版本</span>
          <span class="ml-auto">{{ rightLines.length }}行</span>
        </div>
        <div v-if="selectedVersion" ref="rightScroll" class="flex-1 overflow-auto font-mono text-sm bg-[#fefefe]" @scroll="onRightScroll">
          <table class="w-max min-w-full table-fixed border-collapse">
            <colgroup><col style="width:40px"><col></colgroup>
            <tbody>
              <template v-for="(block, bi) in diffBlocks" :key="'r'+bi">
                <template v-if="block.type !== 'delete'">
                  <tr v-for="ri in (block.rightLines[1] - block.rightLines[0] + 1)" :key="'rl'+bi+'-'+ri" :class="lineClass(block.type, 'right')">
                    <td class="text-[11px] text-[#ccc] text-right pr-1.5 select-none align-top pt-px font-mono leading-5 border-r border-[#f0f0f0]">
                      {{ block.rightLines[0] + ri }}
                    </td>
                    <td class="pl-2 pr-2 whitespace-pre-wrap break-all leading-5 text-[13px]"
                      v-html="renderDiffLine(rightLines[block.rightLines[0]+ri-1]||' ', block.type, 'right', charDiffsForBlock(block).find((cd:any) => cd.newLine === ri-1), ri-1)" />
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
        <textarea v-else v-model="content" class="flex-1 resize-none border-0 outline-none text-sm leading-6 text-[#1a1a1a] bg-transparent p-4 font-serif placeholder:text-[#ccc]" placeholder="开始写作..." spellcheck="false" />
      </div>
    </div>

    <!-- Bottom: version bar + rollback + chat -->
    <div class="border-t border-[#e5e5e5] bg-white shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
      <div class="flex items-center h-8 px-3 border-b border-[#eee] bg-[#fafafa] gap-1 overflow-x-auto">
        <span class="text-[11px] text-[#999] mr-1 shrink-0 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h3l1-3 1 6 1-3h3" stroke="#999" stroke-width="1" fill="none"/></svg>
          版本
        </span>
        <button v-for="ver in versions" :key="ver.id" @click="selectVersion(ver)"
          class="text-[11px] px-2 py-0.5 rounded border shrink-0 transition-colors"
          :class="selectedVersion?.id === ver.id ? 'bg-white border-[#bbb] text-[#1a1a1a] font-semibold shadow-sm' : 'border-transparent text-[#888] hover:bg-black/[0.02] hover:text-[#555]'">
          v{{ ver.num }}
        </button>
        <div class="flex-1" />
        <NPopconfirm v-if="selectedVersion" @positive-click="rollback">
          <template #trigger><NButton size="tiny" type="error" ghost>还原到 v{{ selectedVersion.num }}</NButton></template>
          确定还原到 v{{ selectedVersion.num }}？当前内容将被覆盖。
        </NPopconfirm>
      </div>
      <div class="h-[200px]"><ChatPanel :chapter-id="parseInt(route.params.id as string)" /></div>
    </div>
  </div>
</template>
