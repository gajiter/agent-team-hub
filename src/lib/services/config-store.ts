import type { GlobalConfig } from '@/types/project'

const DB_NAME = 'ai-hub-config'
const DB_VERSION = 1
const STORE_NAME = 'config'
const CONFIG_KEY = 'global'

const DEFAULT_CONFIG: GlobalConfig = {
  projects: [],
  settings: { theme: 'dark', language: 'ko', port: 3000 }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readConfig(): Promise<GlobalConfig> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(CONFIG_KEY)
    req.onsuccess = () => resolve(req.result ?? { ...DEFAULT_CONFIG })
    req.onerror = () => reject(req.error)
  })
}

export async function writeConfig(config: GlobalConfig): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(config, CONFIG_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
