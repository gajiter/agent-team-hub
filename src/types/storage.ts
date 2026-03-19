export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

export interface StorageProvider {
  readFile(projectPath: string, relativePath: string): Promise<string>
  writeFile(projectPath: string, relativePath: string, content: string): Promise<void>
  deleteFile(projectPath: string, relativePath: string): Promise<void>
  listDirectory(projectPath: string, relativePath: string): Promise<FileEntry[]>
  exists(projectPath: string, relativePath: string): Promise<boolean>
}
