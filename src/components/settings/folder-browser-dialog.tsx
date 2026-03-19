'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DirectoryEntry {
  name: string
  path: string
}

interface DirectoryInfo {
  current: string
  parent: string
  directories: DirectoryEntry[]
  isProject: boolean
}

interface FolderBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string) => void
  initialPath?: string
}

export default function FolderBrowserDialog({
  open,
  onOpenChange,
  onSelect,
  initialPath,
}: FolderBrowserDialogProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '')
  const [pathInput, setPathInput] = useState('')
  const [dirInfo, setDirInfo] = useState<DirectoryInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDirectory = useCallback(async (path?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : ''
      const res = await fetch(`/api/directories${params}`)
      if (!res.ok) throw new Error('Failed to read directory')
      const data: DirectoryInfo = await res.json()
      setDirInfo(data)
      setCurrentPath(data.current)
      setPathInput(data.current)
    } catch {
      setError('디렉토리를 읽을 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchDirectory(initialPath || undefined)
    }
  }, [open, initialPath, fetchDirectory])

  const handleNavigate = (path: string) => {
    fetchDirectory(path)
  }

  const handlePathInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchDirectory(pathInput)
    }
  }

  const handleSelect = () => {
    onSelect(currentPath)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>폴더 선택</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Path input */}
          <div className="flex gap-2">
            <Input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={handlePathInputKeyDown}
              placeholder="경로를 입력하세요"
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchDirectory(pathInput)}
              className="shrink-0"
            >
              이동
            </Button>
          </div>

          {/* Directory listing */}
          <div className="rounded-md border border-border bg-muted/30">
            <ScrollArea className="h-[320px]">
              {loading ? (
                <div className="flex items-center justify-center h-full py-12 text-sm text-muted-foreground">
                  불러오는 중...
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full py-12 text-sm text-destructive">
                  {error}
                </div>
              ) : dirInfo ? (
                <div className="divide-y divide-border">
                  {/* Parent directory */}
                  {dirInfo.current !== dirInfo.parent && (
                    <button
                      type="button"
                      onClick={() => handleNavigate(dirInfo.parent)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-muted-foreground">📁</span>
                      <span className="text-muted-foreground font-medium">..</span>
                      <span className="text-xs text-muted-foreground ml-auto">상위 폴더</span>
                    </button>
                  )}
                  {/* Subdirectories */}
                  {dirInfo.directories.map((dir) => (
                    <button
                      key={dir.path}
                      type="button"
                      onClick={() => handleNavigate(dir.path)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-muted-foreground">📁</span>
                      <span className="text-foreground">{dir.name}</span>
                    </button>
                  ))}
                  {dirInfo.directories.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      하위 폴더가 없습니다
                    </div>
                  )}
                </div>
              ) : null}
            </ScrollArea>
          </div>

          {/* Project indicator */}
          {dirInfo?.isProject && (
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span>✓</span> 이 폴더는 프로젝트로 감지되었습니다 (.git 또는 package.json 존재)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" onClick={handleSelect} disabled={!currentPath}>
            선택
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
