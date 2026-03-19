'use client'

import type { AgentInfo } from '@/types/agents'
import { getAgentColors } from '@/types/agents'

interface AgentCardProps {
  agent: AgentInfo
  issueCount?: number
  onClick?: () => void
}

export default function AgentCard({ agent, issueCount = 0, onClick }: AgentCardProps) {
  const colors = getAgentColors(agent)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border-2 p-4 transition-all hover:shadow-md ${colors.border} ${colors.bgLight} hover:scale-[1.01]`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bgLight} ${colors.text} font-medium`}>
              {agent.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{agent.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{agent.model}</span>
            {issueCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {issueCount}개 이슈
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
