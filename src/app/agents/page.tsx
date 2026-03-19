'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProject } from '@/hooks/use-project'
import AgentList from '@/components/agents/agent-list'
import AgentForm from '@/components/agents/agent-form'
import type { AgentInfo } from '@/types/agents'
import { agentService } from '@/lib/services/agent-service'

export default function AgentsPage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null

  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentInfo | null>(null)

  const fetchAgents = useCallback(async () => {
    if (!projectId) {
      setAgents([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await agentService.getAll(projectId)
      setAgents(Array.isArray(data) ? data : [])
    } catch {
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleAddClick = () => {
    setEditingAgent(null)
    setFormOpen(true)
  }

  const handleEditClick = (agent: AgentInfo) => {
    setEditingAgent(agent)
    setFormOpen(true)
  }

  const handleSave = async (data: Omit<AgentInfo, 'content' | 'fileName'>) => {
    if (!projectId) return

    if (editingAgent) {
      await agentService.update(projectId, editingAgent.fileName, data)
    } else {
      await agentService.create(projectId, data)
    }

    await fetchAgents()
  }

  if (!projectId) {
    return (
      <>
        <Topbar title="에이전트" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          프로젝트를 선택하세요
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="에이전트"
        subtitle={`${agents.length}개`}
      />
      <ScrollArea className="flex-1">
        <AgentList
          agents={agents}
          loading={loading}
          onAddClick={handleAddClick}
          onEditClick={handleEditClick}
        />
      </ScrollArea>

      <AgentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={editingAgent}
        onSave={handleSave}
      />
    </>
  )
}
