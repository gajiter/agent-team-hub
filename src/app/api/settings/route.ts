import { NextRequest, NextResponse } from 'next/server'
import { readGlobalConfig, updateSettings } from '@/lib/config'

/**
 * GET /api/settings
 * Read global settings (theme, language, port).
 */
export async function GET() {
  try {
    const config = await readGlobalConfig()
    return NextResponse.json({ settings: config.settings })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/settings
 * Update global settings.
 * body: { theme?, language?, port? }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { theme, language, port } = body

    await updateSettings({ theme, language, port })

    const config = await readGlobalConfig()
    return NextResponse.json({ settings: config.settings })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
