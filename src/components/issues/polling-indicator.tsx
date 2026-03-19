'use client'

import { cn } from '@/lib/utils'

interface PollingIndicatorProps {
  connected: boolean
  lastSyncAt: Date | null
  syncCount: number
  onRefresh: () => void
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return '1h+ ago'
}

export default function PollingIndicator({
  connected,
  lastSyncAt,
  syncCount,
  onRefresh,
}: PollingIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
        title={
          connected
            ? `Auto-sync active (3s interval)\nLast sync: ${lastSyncAt ? formatTimeAgo(lastSyncAt) : 'none'}\nSync count: ${syncCount}`
            : 'Disconnected \u2014 click to retry'
        }
      >
        {/* Connection dot */}
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-green-500' : 'bg-red-500'
          )}
        />
        <span className="hidden sm:inline">
          {connected ? (
            lastSyncAt ? formatTimeAgo(lastSyncAt) : 'Syncing...'
          ) : (
            'Disconnected'
          )}
        </span>
        {/* Refresh icon */}
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
      </button>

      {/* Sync count badge */}
      {syncCount > 0 && (
        <span
          className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium"
          title={`${syncCount} auto-syncs`}
        >
          {syncCount}
        </span>
      )}
    </div>
  )
}
