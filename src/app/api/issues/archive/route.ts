import { NextRequest, NextResponse } from 'next/server'
import {
  archiveIssue,
  unarchiveIssue,
  readArchivedIssues,
  deleteArchivedIssue,
} from '@/lib/issue-store'
import { resolveProjectPath } from '@/lib/api-utils'

/**
 * GET /api/issues/archive?projectId=xxx
 * List archived issues.
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const issues = await readArchivedIssues(projectPath)
    return NextResponse.json({ issues })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read archived issues'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * POST /api/issues/archive
 * Archive or unarchive issues.
 * body: { projectId, ids: string[], action: 'archive' | 'unarchive' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, ids, action } = body as {
      projectId: string
      ids: string[]
      action: 'archive' | 'unarchive'
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }
    if (action !== 'archive' && action !== 'unarchive') {
      return NextResponse.json({ error: 'action must be "archive" or "unarchive"' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const fn = action === 'archive' ? archiveIssue : unarchiveIssue

    const results = await Promise.all(
      ids.map(async (id: string) => {
        const result = await fn(projectPath, id)
        return { id, success: result !== null }
      })
    )

    const successCount = results.filter((r) => r.success).length
    return NextResponse.json({
      [action === 'archive' ? 'archived' : 'unarchived']: successCount,
      results,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to process archive action'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE /api/issues/archive
 * Permanently delete archived issues.
 * body: { projectId, ids: string[] }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, ids } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)

    const results = await Promise.all(
      ids.map(async (id: string) => {
        const ok = await deleteArchivedIssue(projectPath, id)
        return { id, deleted: ok }
      })
    )

    const deleted = results.filter((r) => r.deleted).length
    return NextResponse.json({ deleted, results })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete archived issues'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
