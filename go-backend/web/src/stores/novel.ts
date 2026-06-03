import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'

export const useNovelStore = defineStore('novel', () => {
  const currentNovelId = ref(localStorage.getItem('novelId') || 'default')
  const novels = ref<any[]>([])
  const chapters = ref<any[]>([])

  async function loadNovels() {
    try { novels.value = await api.novels.list() } catch (_) {}
  }

  async function loadChapters() {
    try { chapters.value = await api.chapters.list(currentNovelId.value) } catch (_) {}
  }

  function switchNovel(id: string) {
    currentNovelId.value = id
    localStorage.setItem('novelId', id)
    loadChapters()
  }

  return { currentNovelId, novels, chapters, loadNovels, loadChapters, switchNovel }
})
