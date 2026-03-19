'use client'

import { useState, useEffect, useRef } from 'react'
import type { AgentInfo } from '@/types/agents'
import { agentService } from '@/lib/services/agent-service'

interface UseAgentsResult {
  agents: AgentInfo[]
  agentNames: string[]
  loading: boolean
}

// Module-level cache keyed by projectId
let cachedAgents: AgentInfo[] | null = null
let cachedProjectId: string | null = null
let fetchPromise: Promise<AgentInfo[]> | null = null

function fetchAgents(projectId: string): Promise<AgentInfo[]> {
  if (cachedAgents && cachedProjectId === projectId) return Promise.resolve(cachedAgents)
  if (fetchPromise && cachedProjectId === projectId) return fetchPromise
  // Clear cache for new project
  cachedAgents = null
  cachedProjectId = projectId
  fetchPromise = agentService.getAll(projectId)
    .then((agents) => {
      cachedAgents = agents
      fetchPromise = null
      return agents
    })
    .catch(() => {
      fetchPromise = null
      return [] as AgentInfo[]
    })
  return fetchPromise
}

/** Hook to dynamically fetch agent list (module-level cache, keyed by projectId) */
export function useAgents(projectId: string | null): UseAgentsResult {
  const [agents, setAgents] = useState<AgentInfo[]>(
    cachedAgents && cachedProjectId === projectId ? cachedAgents : []
  )
  const [loading, setLoading] = useState(
    !(cachedAgents && cachedProjectId === projectId)
  )
  const prevProjectIdRef = useRef<string | null>(projectId)

  useEffect(() => {
    // Clear cache when projectId changes
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId
      cachedAgents = null
      fetchPromise = null
    }

    if (!projectId) {
      setAgents([])
      setLoading(false)
      return
    }

    if (cachedAgents && cachedProjectId === projectId) {
      setAgents(cachedAgents)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchAgents(projectId).then((data) => {
      setAgents(data)
      setLoading(false)
    })
  }, [projectId])

  return {
    agents,
    agentNames: agents.map((a) => a.name),
    loading,
  }
}
