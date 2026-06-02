import { MODEL_PRESETS, ModelProvider } from '@/types/model'

describe('Model Types', () => {
  describe('MODEL_PRESETS', () => {
    it('should have all provider presets', () => {
      const providers: ModelProvider[] = [
        'openai',
        'anthropic',
        'deepseek',
        'gemini',
        'ollama',
        'lmstudio',
        'custom',
      ]

      providers.forEach(provider => {
        expect(MODEL_PRESETS[provider]).toBeDefined()
        expect(MODEL_PRESETS[provider].name).toBeTruthy()
        expect(MODEL_PRESETS[provider].description).toBeTruthy()
        expect(MODEL_PRESETS[provider].icon).toBeTruthy()
      })
    })

    it('should have correct OpenAI preset', () => {
      expect(MODEL_PRESETS.openai.name).toBe('OpenAI')
      expect(MODEL_PRESETS.openai.defaultBaseURL).toBe('https://api.openai.com/v1')
    })

    it('should have correct Anthropic preset', () => {
      expect(MODEL_PRESETS.anthropic.name).toBe('Anthropic')
      expect(MODEL_PRESETS.anthropic.defaultBaseURL).toBe('https://api.anthropic.com')
    })

    it('should have correct DeepSeek preset', () => {
      expect(MODEL_PRESETS.deepseek.name).toBe('DeepSeek')
      expect(MODEL_PRESETS.deepseek.defaultBaseURL).toBe('https://api.deepseek.com/v1')
    })

    it('should have correct Gemini preset', () => {
      expect(MODEL_PRESETS.gemini.name).toBe('Google Gemini')
      expect(MODEL_PRESETS.gemini.defaultBaseURL).toBeUndefined()
    })

    it('should have correct Ollama preset', () => {
      expect(MODEL_PRESETS.ollama.name).toBe('Ollama')
      expect(MODEL_PRESETS.ollama.defaultBaseURL).toBe('http://localhost:11434')
    })

    it('should have correct LM Studio preset', () => {
      expect(MODEL_PRESETS.lmstudio.name).toBe('LM Studio')
      expect(MODEL_PRESETS.lmstudio.defaultBaseURL).toBe('http://localhost:1234/v1')
    })

    it('should have correct Custom preset', () => {
      expect(MODEL_PRESETS.custom.name).toBe('自定义')
      expect(MODEL_PRESETS.custom.defaultBaseURL).toBeUndefined()
    })
  })
})
