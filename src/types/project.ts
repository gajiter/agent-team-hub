export interface Project {
  id: string
  name: string
  path: string
  createdAt: string // ISO 8601
}

export interface GlobalConfig {
  projects: Project[]
  settings: {
    theme: 'dark' | 'light'
    language: string
    port: number
  }
}

export interface ProjectConfig {
  initialized: boolean
  createdAt: string
}
