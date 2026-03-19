import { NextRequest, NextResponse } from 'next/server'
import { getProject } from '@/lib/config'
import { initializeProject } from '@/lib/project-init'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const project = await getProject(projectId)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const created = await initializeProject(project.path)

    return NextResponse.json({ success: true, created })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initialize project' },
      { status: 500 }
    )
  }
}
