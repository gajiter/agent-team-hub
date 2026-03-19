'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import type { AgentInfo } from '@/types/agents'
import { getAgentColors } from '@/types/agents'

interface AssigneeMultiSelectProps {
  assignees: string[]
  agentNames: string[]
  agents: AgentInfo[]
  disabled?: boolean
  onChange: (assignees: string[]) => void
  /** Trigger height class (default: h-8) */
  triggerClassName?: string
}

export default function AssigneeMultiSelect({
  assignees,
  agentNames,
  agents,
  disabled = false,
  onChange,
  triggerClassName = 'h-8 text-xs',
}: AssigneeMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const allOptions = ['human', ...agentNames]

  const toggleAssignee = (name: string) => {
    if (disabled) return
    const current = new Set(assignees)
    if (current.has(name)) {
      current.delete(name)
    } else {
      current.add(name)
    }
    // Keep at least 1 assignee
    if (current.size === 0) return
    onChange(Array.from(current))
  }

  // Display summary text
  const displayText = assignees.length === 0
    ? 'human'
    : assignees.length === 1
      ? assignees[0]
      : `${assignees[0]} +${assignees.length - 1}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-1 ring-offset-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-1 max-h-60 overflow-y-auto"
      >
        {allOptions.map((name) => {
          const isHuman = name === 'human'
          const agent = !isHuman ? agents.find((a) => a.name === name) : undefined
          const colors = agent ? getAgentColors(agent) : undefined
          const checked = assignees.includes(name)

          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleAssignee(name)}
              className={cn(
                'flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                checked && 'bg-accent/50',
              )}
            >
              <Checkbox
                checked={checked}
                tabIndex={-1}
                className="pointer-events-none size-3.5"
              />
              <span className={cn('flex items-center gap-1', colors?.text)}>
                <span>{isHuman ? '\u{1F464}' : agent?.emoji ?? '\u{1F916}'}</span>
                <span>{name}</span>
              </span>
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
