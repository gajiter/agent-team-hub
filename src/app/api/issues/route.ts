import { NextRequest, NextResponse } from 'next/server'
import {
  readAllIssues,
  readIssue,
  createIssue,
  updateIssue,
  deleteIssue,
} from '@/lib/issue-store'
import { resolveProjectPath } from '@/lib/api-utils'

/**
 * GET /api/issues
 *  - ?projectId=xxx            → all issues
 *  - ?projectId=xxx&id=ISS-001 → single issue
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)

    // Single issue lookup
    const id = searchParams.get('id')
    if (id) {
      const issue = await readIssue(projectPath, id)
      if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
      return NextResponse.json(issue)
    }

    // All issues
    const issues = await readAllIssues(projectPath)
    return NextResponse.json({ issues })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read issues'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/** POST /api/issues — create issue */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, ...issueData } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const newIssue = await createIssue(projectPath, issueData)
    return NextResponse.json(newIssue, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create issue'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/** PUT /api/issues — update issue (id required) */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, id, ...updates } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const updated = await updateIssue(projectPath, id, updates)

    if (!updated) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update issue'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE /api/issues — batch delete
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
        const ok = await deleteIssue(projectPath, id)
        return { id, deleted: ok }
      })
    )

    const deleted = results.filter((r) => r.deleted).length
    return NextResponse.json({ deleted, results })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete issues'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
