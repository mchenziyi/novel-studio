import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'

export const useNovelStore = defineStore('novel', () => {
  const currentNovelId = ref('default')
  const novels = ref<any[]>([])

  async function loadNovels() {
    try { novels.value = await api.novels.list() } catch (_) {}
  }

  function switchNovel(id: string) {
    currentNovelId.value = id
  }

  return { currentNovelId, novels, loadNovels, switchNovel }
})
