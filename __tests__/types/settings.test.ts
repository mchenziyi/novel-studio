import { DEFAULT_SETTINGS, GlobalSettings } from '@/types/settings'

describe('Settings Types', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have proxy settings', () => {
      expect(DEFAULT_SETTINGS.proxy).toBeDefined()
    })

    it('should have proxy disabled by default', () => {
      expect(DEFAULT_SETTINGS.proxy?.enabled).toBe(false)
    })

    it('should have default proxy URL', () => {
      expect(DEFAULT_SETTINGS.proxy?.url).toBe('http://127.0.0.1:7890')
    })
  })

  describe('GlobalSettings interface', () => {
    it('should accept valid settings object', () => {
      const settings: GlobalSettings = {
        proxy: {
          enabled: true,
          url: 'http://localhost:8080',
        },
      }

      expect(settings.proxy?.enabled).toBe(true)
      expect(settings.proxy?.url).toBe('http://localhost:8080')
    })

    it('should accept empty settings', () => {
      const settings: GlobalSettings = {}
      expect(settings.proxy).toBeUndefined()
    })

    it('should accept settings with only proxy enabled', () => {
      const settings: GlobalSettings = {
        proxy: {
          enabled: true,
          url: '',
        },
      }

      expect(settings.proxy?.enabled).toBe(true)
      expect(settings.proxy?.url).toBe('')
    })
  })
})
