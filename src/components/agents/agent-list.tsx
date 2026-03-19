'use client'

import { Button } from '@/components/ui/button'
import AgentCard from './agent-card'
import type { AgentInfo } from '@/types/agents'

interface AgentListProps {
  agents: AgentInfo[]
  loading: boolean
  onAddClick: () => void
  onEditClick: (agent: AgentInfo) => void
}

export default function AgentList({ agents, loading, onAddClick, onEditClick }: AgentListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        에이전트 목록 로딩 중...
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            {agents.length}개 에이전트 등록됨
          </h2>
        </div>
        <Button onClick={onAddClick} size="sm">
          + 에이전트 추가
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <span className="text-4xl">🤖</span>
          <p className="text-sm">등록된 에이전트가 없습니다</p>
          <p className="text-xs">에이전트를 추가하여 팀을 구성하세요</p>
          <Button onClick={onAddClick} size="sm" className="mt-2">
            첫 에이전트 추가
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.name}
              agent={agent}
              onClick={() => onEditClick(agent)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
