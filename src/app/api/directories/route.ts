import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const targetPath = searchParams.get('path') || homedir()

    const entries = await readdir(targetPath, { withFileTypes: true })
    const directories = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => ({
        name: entry.name,
        path: join(targetPath, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Check if current path is a git repo or has package.json (likely a project)
    let isProject = false
    try {
      await stat(join(targetPath, '.git'))
      isProject = true
    } catch {
      try {
        await stat(join(targetPath, 'package.json'))
        isProject = true
      } catch {
        // not a project
      }
    }

    return NextResponse.json({
      current: targetPath,
      parent: join(targetPath, '..'),
      directories,
      isProject,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    )
  }
}
