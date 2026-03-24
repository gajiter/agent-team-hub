import fs from 'fs/promises'
import path from 'path'
import { LocalStorageProvider } from './storage/local'

const storage = new LocalStorageProvider()

export async function initializeProject(projectPath: string): Promise<string[]> {
  const created: string[] = []

  // 1. Create .hub/config.json
  if (!await storage.exists(projectPath, '.hub/config.json')) {
    await storage.writeFile(projectPath, '.hub/config.json', JSON.stringify({
      initialized: true,
      createdAt: new Date().toISOString()
    }, null, 2))
    created.push('.hub/config.json')
  }

  // 2. Create directories (writeFile creates parent dirs automatically)
  for (const dir of ['docs', 'issues', 'issues/archive']) {
    const dirPath = path.resolve(projectPath, dir)
    await fs.mkdir(dirPath, { recursive: true })
  }

  // 3. Create issues/_index.json
  if (!await storage.exists(projectPath, 'issues/_index.json')) {
    await storage.writeFile(projectPath, 'issues/_index.json', JSON.stringify({
      version: '1.0',
      nextId: 1
    }, null, 2))
    created.push('issues/_index.json')
  }

  // 4. Insert CLAUDE.md section
  await insertClaudeMdSection(projectPath)
  created.push('CLAUDE.md')

  // 5. Create .claude/rules/hub-workflow.md from template
  if (!await storage.exists(projectPath, '.claude/rules/hub-workflow.md')) {
    const workflowTemplate = await fs.readFile(
      path.join(process.cwd(), 'src/templates/hub-workflow.md'),
      'utf-8'
    )
    await storage.writeFile(projectPath, '.claude/rules/hub-workflow.md', workflowTemplate)
    created.push('.claude/rules/hub-workflow.md')
  }

  // 6. Create .claude/skills/hub/SKILL.md from template (Claude Code skill spec)
  if (!await storage.exists(projectPath, '.claude/skills/hub/SKILL.md')) {
    const skillTemplate = await fs.readFile(
      path.join(process.cwd(), 'src/templates/hub-skill/SKILL.md'),
      'utf-8'
    )
    await storage.writeFile(projectPath, '.claude/skills/hub/SKILL.md', skillTemplate)
    created.push('.claude/skills/hub/SKILL.md')
  }

  // 7. Create .claude/skills/hub/scripts/issue-cli.js (issue management CLI)
  if (!await storage.exists(projectPath, '.claude/skills/hub/scripts/issue-cli.js')) {
    const cliTemplate = await fs.readFile(
      path.join(process.cwd(), 'src/templates/hub-skill/scripts/issue-cli.js'),
      'utf-8'
    )
    await storage.writeFile(projectPath, '.claude/skills/hub/scripts/issue-cli.js', cliTemplate)
    created.push('.claude/skills/hub/scripts/issue-cli.js')
  }

  // 8. Create .claude/skills/hub/references/schemas.md (progressive disclosure)
  if (!await storage.exists(projectPath, '.claude/skills/hub/references/schemas.md')) {
    const schemasTemplate = await fs.readFile(
      path.join(process.cwd(), 'src/templates/hub-skill/references/schemas.md'),
      'utf-8'
    )
    await storage.writeFile(projectPath, '.claude/skills/hub/references/schemas.md', schemasTemplate)
    created.push('.claude/skills/hub/references/schemas.md')
  }

  return created
}

export async function checkInitialized(projectPath: string): Promise<boolean> {
  return storage.exists(projectPath, '.hub/config.json')
}

export async function insertClaudeMdSection(projectPath: string): Promise<void> {
  const templatePath = path.join(process.cwd(), 'src/templates/claude-md-section.md')
  const template = await fs.readFile(templatePath, 'utf-8')

  let content = ''
  try {
    content = await storage.readFile(projectPath, 'CLAUDE.md')
  } catch {
    // File doesn't exist yet, start with empty content
  }

  const startMarker = '<!-- agent-team-hub:start -->'
  const endMarker = '<!-- agent-team-hub:end -->'

  if (content.includes(startMarker)) {
    // Replace existing section
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`)
    content = content.replace(regex, template.trim())
  } else {
    // Append section
    content = content ? content + '\n\n' + template.trim() : template.trim()
  }

  await storage.writeFile(projectPath, 'CLAUDE.md', content)
}
