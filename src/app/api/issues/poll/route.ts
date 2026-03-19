import { NextRequest, NextResponse } from 'next/server'
import { readIssueSummaries, readAllLockStatuses } from '@/lib/issue-store'
import { resolveProjectPath } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/issues/poll?projectId=xxx
 *
 * Lightweight polling endpoint — returns issue summaries and active lock statuses.
 * Clients compare the fingerprint with their previous snapshot and only re-fetch
 * full issues when changes are detected.
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)

    const [summaries, locks] = await Promise.all([
      readIssueSummaries(projectPath),
      readAllLockStatuses(projectPath),
    ])

    // fingerprint: hash of all issue summaries for change detection
    const fingerprint = summaries
      .map((s) => `${s.id}:${s.updatedAt}:${s.status}:${s.commentsCount}`)
      .sort()
      .join('|')

    return NextResponse.json({
      fingerprint,
      count: summaries.length,
      summaries,
      locks,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to poll issues'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
