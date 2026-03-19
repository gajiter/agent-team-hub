import { NextRequest, NextResponse } from 'next/server'
import { getProject } from '@/lib/config'
import { initializeProject, checkInitialized } from '@/lib/project-init'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')

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

    const initialized = await checkInitialized(project.path)
    return NextResponse.json({ initialized })
  } catch {
    return NextResponse.json(
      { error: 'Failed to check initialization status' },
      { status: 500 }
    )
  }
}

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
    const message = error instanceof Error ? error.message : 'Failed to initialize project'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
