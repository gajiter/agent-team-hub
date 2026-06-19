import { NextResponse } from 'next/server'
import { getServerStorage, isGitHubStorageMode } from '@/lib/storage'

export async function GET() {
  const mode = isGitHubStorageMode() ? 'github' : 'local'
  const storage = getServerStorage()
  let issues = ''
  let agents = ''

  try {
    const list = await storage.listDirectory('', 'issues')
    issues = list.map(f => f.name).join(', ')
  } catch (_e) {
    issues = 'error: ' + String(_e)
  }
  try {
    const list = await storage.listDirectory('', '.claude/agents')
    agents = list.map(f => f.name).join(', ')
  } catch (_e) {
    agents = 'error: ' + String(_e)
  }

  return NextResponse.json({
    mode, issues, agents,
    env: { hasToken: !!process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPO || 'not set' }
  })
}
