import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectPath } from '@/lib/api-utils'
import { LocalStorageProvider } from '@/lib/storage/local'

const storage = new LocalStorageProvider()

const VALID_TYPES = ['prd', 'features', 'roles', 'userflow'] as const
type PlanningType = typeof VALID_TYPES[number]

function isValidType(type: string): type is PlanningType {
  return VALID_TYPES.includes(type as PlanningType)
}

/**
 * GET /api/planning?projectId=xxx&type=prd
 * Read planning data from data/{type}.json
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')
    const type = req.nextUrl.searchParams.get('type')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!type || !isValidType(type)) {
      return NextResponse.json(
        { error: `type is required and must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const projectPath = await resolveProjectPath(projectId)
    const filePath = `data/${type}.json`

    const exists = await storage.exists(projectPath, filePath)
    if (!exists) {
      return NextResponse.json({ data: null, exists: false })
    }

    const content = await storage.readFile(projectPath, filePath)
    try {
      const data = JSON.parse(content)
      return NextResponse.json({ data, exists: true })
    } catch {
      return NextResponse.json({ data: null, exists: true, error: 'Invalid JSON' }, { status: 422 })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read planning data'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * PUT /api/planning
 * Write planning data to data/{type}.json
 * body: { projectId, type, data }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, type, data } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!type || !isValidType(type)) {
      return NextResponse.json(
        { error: `type is required and must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (data === undefined) {
      return NextResponse.json({ error: 'data is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)
    const filePath = `data/${type}.json`
    const content = JSON.stringify(data, null, 2)

    await storage.writeFile(projectPath, filePath, content)
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to write planning data'
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
