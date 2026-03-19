import { NextRequest, NextResponse } from 'next/server'
import {
  readGlobalConfig,
  addProject,
  updateProject,
  removeProject
} from '@/lib/config'

export async function GET() {
  try {
    const config = await readGlobalConfig()
    return NextResponse.json({ projects: config.projects })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, path } = body

    if (!name || !path) {
      return NextResponse.json(
        { error: 'name and path are required' },
        { status: 400 }
      )
    }

    const project = await addProject(name, path)
    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, path } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const project = await updateProject(id, { name, path })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    await removeProject(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove project' },
      { status: 500 }
    )
  }
}
