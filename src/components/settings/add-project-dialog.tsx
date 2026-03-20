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
import { useI18n } from '@/lib/i18n'
import FolderBrowserDialog from './folder-browser-dialog'

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
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false)
  const { t } = useI18n()

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
          <DialogTitle>{t('settings.addProject')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settings.projectName')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('settings.projectPath')}</label>
            <div className="flex gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/Users/username/workspace/my-project"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setFolderBrowserOpen(true)}
                className="shrink-0"
              >
                {t('common.browse')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('settings.projectPathHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="initialize"
              checked={initialize}
              onCheckedChange={(checked) => setInitialize(checked === true)}
            />
            <label htmlFor="initialize" className="text-sm text-foreground cursor-pointer">
              {t('settings.initializeOnAdd')}
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving || !name.trim() || !path.trim()}>
              {saving ? t('settings.adding') : t('common.add')}
            </Button>
          </DialogFooter>
        </form>

        <FolderBrowserDialog
          open={folderBrowserOpen}
          onOpenChange={setFolderBrowserOpen}
          initialPath={path || undefined}
          onSelect={(selectedPath) => {
            setPath(selectedPath)
            if (!name.trim()) {
              const folderName = selectedPath.split('/').filter(Boolean).pop() || ''
              setName(folderName)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
