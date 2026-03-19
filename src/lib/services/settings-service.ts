import type { GlobalConfig } from '@/types/project'
import { isBrowserMode } from './mode'
import { readConfig, writeConfig } from './config-store'

type Settings = GlobalConfig['settings']

export const settingsService = {
  async getSettings(): Promise<Settings> {
    if (isBrowserMode()) {
      const config = await readConfig()
      return config.settings
    }
    const res = await fetch('/api/settings')
    const data = await res.json()
    return data.settings
  },

  async updateSettings(updates: Partial<Settings>): Promise<void> {
    if (isBrowserMode()) {
      const config = await readConfig()
      config.settings = { ...config.settings, ...updates }
      await writeConfig(config)
      return
    }
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  },
}
