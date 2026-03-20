'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import type { AgentInfo } from '@/types/agents'

const COLOR_OPTIONS = [
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
]

const MODEL_OPTIONS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
]

const EMOJI_OPTIONS = ['🤖', '🧠', '🔧', '📝', '🎨', '🔍', '📊', '🛡️', '🚀', '💡', '⚙️', '🏗️']

interface AgentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: AgentInfo | null
  onSave: (data: Omit<AgentInfo, 'content' | 'fileName'>) => Promise<void>
}

export default function AgentForm({ open, onOpenChange, agent, onSave }: AgentFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState(MODEL_OPTIONS[0])
  const [color, setColor] = useState('blue')
  const [emoji, setEmoji] = useState('🤖')
  const [role, setRole] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [saving, setSaving] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDescription(agent.description)
      setModel(agent.model)
      setColor(agent.color)
      setEmoji(agent.emoji)
      setRole(agent.role)
      setResponsibilities('')
    } else {
      setName('')
      setDescription('')
      setModel(MODEL_OPTIONS[0])
      setColor('blue')
      setEmoji('🤖')
      setRole('')
      setResponsibilities('')
    }
  }, [agent, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        model,
        color,
        emoji,
        role: role.trim(),
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{agent ? t('agents.editAgent') : t('agents.createAgent')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.name')}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('agents.agentNamePlaceholder')} required />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.description')}</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('agents.agentDescPlaceholder')} rows={2} />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.role')}</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('agents.agentRolePlaceholder')} />
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.model')}</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Emoji */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.emoji')}</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-accent ring-2 ring-primary' : 'bg-muted hover:bg-accent/50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.color')}</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Responsibilities */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('agents.responsibilities')} ({t('agents.responsibilitiesHint')})</label>
            <Textarea value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} placeholder="..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t('agents.saving') : agent ? t('common.save') : t('common.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
