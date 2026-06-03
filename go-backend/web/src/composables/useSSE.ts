import { ref } from 'vue'

export interface ToolCallState {
  name: string
  status: 'pending' | 'done' | 'error'
  input?: string
  output?: string
}

export interface SSEResult {
  text: string
  toolCalls: ToolCallState[]
  isDone: boolean
  error: string
}

export function useSSE() {
  const text = ref('')
  const toolCalls = ref<ToolCallState[]>([])
  const isDone = ref(false)
  const error = ref('')
  let abortController: AbortController | null = null

  function reset() {
    text.value = ''
    toolCalls.value = []
    isDone.value = false
    error.value = ''
  }

  async function connect(resp: Response, onChunk?: (t: string) => void) {
    reset()
    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          switch (data.type) {
            case 'chunk':
              text.value += data.text
              onChunk?.(data.text)
              break
            case 'tool_start': {
              const existing = toolCalls.value.find(t => t.name === data.toolName && t.status === 'pending')
              if (!existing) {
                toolCalls.value.push({ name: data.toolName, status: 'pending', input: data.toolInput })
              }
              break
            }
            case 'tool_end': {
              const tc = toolCalls.value.find(t => t.name === data.toolName && t.status === 'pending')
              if (tc) { tc.status = 'done'; tc.output = data.toolOutput }
              else { toolCalls.value.push({ name: data.toolName, status: 'done', input: '', output: data.toolOutput }) }
              break
            }
            case 'error':
              error.value = data.error
              break
            case 'done':
              isDone.value = true
              break
          }
        }
      }
    } catch (e: any) {
      error.value = e.message
    }
  }

  function abort() {
    abortController?.abort()
  }

  return { text, toolCalls, isDone, error, connect, abort, reset }
}
