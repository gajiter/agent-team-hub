'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; path: string; initialize: boolean }) => Promise<void>
}

export default function AddProjectDialog({ open, onOpenChange, onSubmit }: AddProjectDialogProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [initialize, setInitialize] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return

    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), path: path.trim(), initialize })
      setName('')
      setPath('')
      setInitialize(true)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>프로젝트 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">프로젝트 이름</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">프로젝트 경로</label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/username/workspace/my-project"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">프로젝트 루트 디렉토리의 절대 경로</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="initialize"
              checked={initialize}
              onCheckedChange={(checked) => setInitialize(checked === true)}
            />
            <label htmlFor="initialize" className="text-sm text-foreground cursor-pointer">
              프로젝트 초기화 (.ai-hub 디렉토리 생성)
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={saving || !name.trim() || !path.trim()}>
              {saving ? '추가 중...' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
