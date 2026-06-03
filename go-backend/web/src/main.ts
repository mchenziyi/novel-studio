import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import naive from 'naive-ui'
import App from './App.vue'

const routes = [
  { path: '/',              component: () => import('./pages/HomePage.vue') },
  { path: '/chapters',      component: () => import('./pages/ChaptersPage.vue') },
  { path: '/chapters/:id',  component: () => import('./pages/ChapterEditorPage.vue') },
  { path: '/agent/chat',    component: () => import('./pages/AgentChatPage.vue') },
  { path: '/characters',    component: () => import('./pages/CharactersPage.vue') },
  { path: '/foreshadowing', component: () => import('./pages/ForeshadowingPage.vue') },
  { path: '/outline',       component: () => import('./pages/OutlinePage.vue') },
  { path: '/plotlines',     component: () => import('./pages/PlotlinesPage.vue') },
  { path: '/search',        component: () => import('./pages/SearchPage.vue') },
  { path: '/stats',         component: () => import('./pages/StatsPage.vue') },
  { path: '/settings',      component: () => import('./pages/SettingsPage.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })
const pinia = createPinia()
const app = createApp(App)
app.use(router).use(pinia).use(naive)
app.mount('#app')
