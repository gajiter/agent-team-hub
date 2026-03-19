import { NextRequest, NextResponse } from 'next/server'
import { readAllLockStatuses } from '@/lib/issue-store'
import { resolveProjectPath } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/issues/locks?projectId=xxx
 *
 * Returns current active lock statuses for all issues.
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const locks = await readAllLockStatuses(projectPath)
    return NextResponse.json({ locks })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read lock statuses'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
