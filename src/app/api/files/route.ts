import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectPath } from '@/lib/api-utils'
import { LocalStorageProvider } from '@/lib/storage/local'

const storage = new LocalStorageProvider()

/**
 * GET /api/files?projectId=xxx&path=data/prd.json
 * Read a file from the project directory.
 * Validates path to prevent directory traversal.
 */
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId')
    const filePath = req.nextUrl.searchParams.get('path')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!filePath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    const projectPath = await resolveProjectPath(projectId)

    const exists = await storage.exists(projectPath, filePath)
    if (!exists) {
      return NextResponse.json({ content: '', exists: false })
    }

    const content = await storage.readFile(projectPath, filePath)
    return NextResponse.json({ content, exists: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read file'
    if (message === 'Path traversal detected') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }
    const status = message === 'Project not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
