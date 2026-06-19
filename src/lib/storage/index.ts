export { LocalStorageProvider } from './local'
export { BrowserStorageProvider } from './browser'
export { GitHubStorageProvider } from './github'
export type { StorageProvider, FileEntry } from '@/types/storage'

import type { StorageProvider } from '@/types/storage'
import { LocalStorageProvider } from './local'
import { GitHubStorageProvider } from './github'

/**
 * Server-side storage factory.
 * Returns GitHubStorageProvider when GITHUB_TOKEN + GITHUB_REPO are set,
 * otherwise falls back to LocalStorageProvider (for local dev).
 */
let _serverStorage: StorageProvider | null = null

export function getServerStorage(): StorageProvider {
  if (_serverStorage) return _serverStorage

  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    _serverStorage = new GitHubStorageProvider()
  } else {
    _serverStorage = new LocalStorageProvider()
  }

  return _serverStorage
}

/**
 * Check if we're running in GitHub storage mode.
 */
export function isGitHubStorageMode(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO)
}
