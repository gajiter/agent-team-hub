export type StorageMode = 'server' | 'browser'

export function getStorageMode(): StorageMode {
  const mode = process.env.NEXT_PUBLIC_STORAGE_MODE
  if (mode === 'browser') return 'browser'
  return 'server'
}

export function isBrowserMode(): boolean {
  return getStorageMode() === 'browser'
}
