'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Issue } from '@/types/issues'
import type { IssueLockStatus } from '@/types/issues'

interface PollResponse {
  fingerprint: string
  count: number
  summaries: { id: string; updatedAt: string; status: string; commentsCount: number }[]
  locks: IssueLockStatus[]
  timestamp: string
}

interface UseIssuePollingOptions {
  /** Project ID to poll issues for. If null, polling is skipped. */
  projectId: string | null
  /** Polling interval in ms. Default 3000 (3s) */
  intervalMs?: number
  /** Whether polling is enabled. Default true */
  enabled?: boolean
}

interface UseIssuePollingResult {
  issues: Issue[]
  locks: Map<string, IssueLockStatus>
  loading: boolean
  /** Last sync timestamp */
  lastSyncAt: Date | null
  /** Number of times changes were detected and synced */
  syncCount: number
  /** Polling connection status */
  connected: boolean
  /** Manual refresh */
  refresh: () => Promise<void>
}

export function useIssuePolling(options: UseIssuePollingOptions): UseIssuePollingResult {
  const { projectId, intervalMs = 3000, enabled = true } = options

  const [issues, setIssues] = useState<Issue[]>([])
  const [locks, setLocks] = useState<Map<string, IssueLockStatus>>(new Map())
  const [loading, setLoading] = useState(true)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [syncCount, setSyncCount] = useState(0)
  const [connected, setConnected] = useState(false)

  const fingerprintRef = useRef<string>('')

  /** Fetch full issue data */
  const fetchFullIssues = useCallback(async (): Promise<Issue[]> => {
    if (!projectId) return []
    const res = await fetch(`/api/issues?projectId=${projectId}`)
    const data: { issues: Issue[] } = await res.json()
    const issueList = data.issues || []

    // Sort by updatedAt descending
    return [...issueList].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [projectId])

  /** Lightweight polling: compare fingerprint, full fetch only on change */
  const poll = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/issues/poll?projectId=${projectId}`)
      if (!res.ok) {
        setConnected(false)
        return
      }

      const data: PollResponse = await res.json()
      setConnected(true)

      // Update lock status (every poll)
      const lockMap = new Map<string, IssueLockStatus>()
      for (const lock of data.locks) {
        lockMap.set(lock.issueId, lock)
      }
      setLocks(lockMap)

      // Fingerprint change detection
      if (data.fingerprint !== fingerprintRef.current) {
        const prevFingerprint = fingerprintRef.current
        fingerprintRef.current = data.fingerprint

        // Only increment syncCount if not the initial load
        if (prevFingerprint !== '') {
          setSyncCount((c) => c + 1)
        }

        // Fetch full issue data
        const sorted = await fetchFullIssues()
        setIssues(sorted)
        setLastSyncAt(new Date())
      }
    } catch {
      setConnected(false)
    }
  }, [projectId, fetchFullIssues])

  /** Initial load & reset when projectId changes */
  useEffect(() => {
    if (!projectId) {
      setIssues([])
      setLocks(new Map())
      setLoading(false)
      setConnected(false)
      fingerprintRef.current = ''
      return
    }

    let cancelled = false

    async function init() {
      setLoading(true)
      fingerprintRef.current = ''
      try {
        const sorted = await fetchFullIssues()
        if (!cancelled) {
          setIssues(sorted)
          setLastSyncAt(new Date())
          setConnected(true)
        }

        // Set initial fingerprint
        const res = await fetch(`/api/issues/poll?projectId=${projectId}`)
        if (res.ok && !cancelled) {
          const data: PollResponse = await res.json()
          fingerprintRef.current = data.fingerprint

          // Initial lock status
          const lockMap = new Map<string, IssueLockStatus>()
          for (const lock of data.locks) {
            lockMap.set(lock.issueId, lock)
          }
          setLocks(lockMap)
        }
      } catch {
        if (!cancelled) setConnected(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [projectId, fetchFullIssues])

  /** Polling interval */
  useEffect(() => {
    if (!enabled || loading || !projectId) return

    const timer = setInterval(poll, intervalMs)
    return () => clearInterval(timer)
  }, [enabled, loading, intervalMs, poll, projectId])

  /** Manual refresh */
  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const sorted = await fetchFullIssues()
      setIssues(sorted)
      setLastSyncAt(new Date())
      setSyncCount((c) => c + 1)

      // Refresh fingerprint too
      const res = await fetch(`/api/issues/poll?projectId=${projectId}`)
      if (res.ok) {
        const data: PollResponse = await res.json()
        fingerprintRef.current = data.fingerprint

        const lockMap = new Map<string, IssueLockStatus>()
        for (const lock of data.locks) {
          lockMap.set(lock.issueId, lock)
        }
        setLocks(lockMap)
      }

      setConnected(true)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchFullIssues])

  return {
    issues,
    locks,
    loading,
    lastSyncAt,
    syncCount,
    connected,
    refresh,
  }
}
