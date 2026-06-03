const BASE = '/api'

async function request(method: string, path: string, body?: any): Promise<any> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Chapters
  chapters: {
    list: (novelId: string) => request('GET', `/chapters?novelId=${novelId}`),
    get: (id: string) => request('GET', `/chapters/${id}`),
    create: (data: any) => request('POST', '/chapters/create', data),
    update: (id: string, data: any) => request('PUT', `/chapters/${id}`, data),
    delete: (id: string) => request('DELETE', `/chapters/${id}`),
    history: (id: string) => request('GET', `/chapters/${id}/history`),
    diff: (id: string, from: string, to?: string) =>
      request('GET', `/chapters/${id}/diff?from=${from}&to=${to || 'current'}`),
    rollback: (id: string, versionId: string) =>
      request('POST', `/chapters/${id}/rollback`, { versionId }),
  },
  // Agent
  agent: {
    chat: (body: any) => fetch(`${BASE}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    sessions: (novelId: string) => request('GET', `/agent/chat?novelId=${novelId}`),
    messages: (sessionId: string) => request('GET', `/agent/chat?sessionId=${sessionId}`),
    delete: (id: string) => request('DELETE', `/agent/chat/${id}`),
  },
  // Others
  novels: {
    list: () => request('GET', '/novels'),
    config: (id: string) => request('GET', `/novels/${id}/config`),
    updateConfig: (id: string, data: any) => request('PUT', `/novels/${id}/config`, data),
  },
  characters: {
    list: (novelId: string) => request('GET', `/characters?novelId=${novelId}`),
    create: (data: any) => request('POST', '/characters', data),
    update: (id: string, data: any) => request('PUT', `/characters/${id}`, data),
  },
  foreshadowing: {
    list: (novelId: string, status?: string) =>
      request('GET', `/foreshadowing?novelId=${novelId}${status ? `&status=${status}` : ''}`),
    create: (data: any) => request('POST', '/foreshadowing', data),
    update: (id: string, data: any) => request('PUT', `/foreshadowing/${id}`, data),
  },
  outline: {
    get: (novelId: string) => request('GET', `/outline?novelId=${novelId}`),
    update: (data: any) => request('PUT', '/outline', data),
  },
  style: {
    list: (novelId: string) => request('GET', `/style?novelId=${novelId}`),
    create: (data: any) => request('POST', '/style', data),
    activate: (id: number) => request('POST', `/style/${id}/activate`),
    delete: (id: number) => request('DELETE', `/style/${id}`),
  },
  models: {
    list: () => request('GET', '/models'),
    create: (data: any) => request('POST', '/models', data),
    update: (id: string, data: any) => request('PUT', `/models/${id}`, data),
    delete: (id: string) => request('DELETE', `/models/${id}`),
    fetchList: (provider: string, apiKey: string, baseURL?: string) =>
      request('GET', `/models/list?provider=${provider}&apiKey=${apiKey}&baseURL=${encodeURIComponent(baseURL || '')}`),
    test: (data: any) => request('POST', '/models/test', data),
  },
  stats: {
    get: (novelId: string) => request('GET', `/stats?novelId=${novelId}`),
  },
  search: {
    search: (novelId: string, q: string) =>
      request('GET', `/search?novelId=${novelId}&q=${encodeURIComponent(q)}`),
  },
  plotlines: {
    list: (novelId: string) => request('GET', `/plotlines?novelId=${novelId}`),
    create: (data: any) => request('POST', '/plotlines', data),
    update: (id: string, data: any) => request('PUT', `/plotlines/${id}`, data),
  },
}
