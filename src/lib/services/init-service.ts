import { isBrowserMode } from './mode'
import { projectService } from './project-service'
import { getBrowserStorage } from '@/lib/storage/browser'
import {
  CLAUDE_MD_SECTION,
  HUB_WORKFLOW_TEMPLATE,
  HUB_SKILL_TEMPLATE,
  HUB_SKILL_SCHEMAS_TEMPLATE,
  HUB_ISSUE_CLI_TEMPLATE,
} from '@/lib/templates-bundled'

const START_MARKER = '<!-- agent-team-hub:start -->'
const END_MARKER = '<!-- agent-team-hub:end -->'

export const initService = {
  async checkInit(projectId: string): Promise<boolean> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      return storage.exists(projectPath, '.hub/config.json')
    }

    const res = await fetch(
      `/api/init?projectId=${encodeURIComponent(projectId)}`
    )
    const data = await res.json()
    return data.initialized ?? false
  },

  async init(projectId: string): Promise<string[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      const storage = getBrowserStorage()
      const created: string[] = []

      // 1. .hub/config.json
      const configExists = await storage.exists(projectPath, '.hub/config.json')
      if (!configExists) {
        await storage.writeFile(
          projectPath,
          '.hub/config.json',
          JSON.stringify(
            { initialized: true, createdAt: new Date().toISOString() },
            null,
            2
          )
        )
        created.push('.hub/config.json')
      }

      // 2. Directories
      for (const dir of ['docs', 'issues', 'issues/archive']) {
        await storage.createDirectory(projectPath, dir)
      }

      // 3. issues/_index.json
      const indexExists = await storage.exists(projectPath, 'issues/_index.json')
      if (!indexExists) {
        await storage.writeFile(
          projectPath,
          'issues/_index.json',
          JSON.stringify({ version: '1.0', nextId: 1 }, null, 2)
        )
        created.push('issues/_index.json')
      }

      // 4. CLAUDE.md — insert or replace section
      let claudeMd = ''
      const claudeMdExists = await storage.exists(projectPath, 'CLAUDE.md')
      if (claudeMdExists) {
        claudeMd = await storage.readFile(projectPath, 'CLAUDE.md')
      }

      const startIdx = claudeMd.indexOf(START_MARKER)
      const endIdx = claudeMd.indexOf(END_MARKER)

      if (startIdx !== -1 && endIdx !== -1) {
        // Replace existing section
        claudeMd =
          claudeMd.slice(0, startIdx) +
          CLAUDE_MD_SECTION +
          claudeMd.slice(endIdx + END_MARKER.length)
      } else {
        // Append section
        claudeMd = claudeMd
          ? claudeMd.trimEnd() + '\n\n' + CLAUDE_MD_SECTION + '\n'
          : CLAUDE_MD_SECTION + '\n'
      }

      await storage.writeFile(projectPath, 'CLAUDE.md', claudeMd)
      created.push('CLAUDE.md')

      // 5. .claude/rules/hub-workflow.md
      const workflowExists = await storage.exists(
        projectPath,
        '.claude/rules/hub-workflow.md'
      )
      if (!workflowExists) {
        await storage.writeFile(
          projectPath,
          '.claude/rules/hub-workflow.md',
          HUB_WORKFLOW_TEMPLATE
        )
        created.push('.claude/rules/hub-workflow.md')
      }

      // 6. .claude/skills/hub/SKILL.md (Claude Code skill spec: subdirectory + SKILL.md)
      const skillExists = await storage.exists(
        projectPath,
        '.claude/skills/hub/SKILL.md'
      )
      if (!skillExists) {
        await storage.writeFile(
          projectPath,
          '.claude/skills/hub/SKILL.md',
          HUB_SKILL_TEMPLATE
        )
        created.push('.claude/skills/hub/SKILL.md')
      }

      // 7. .claude/skills/hub/scripts/issue-cli.js (issue management CLI)
      const cliExists = await storage.exists(
        projectPath,
        '.claude/skills/hub/scripts/issue-cli.js'
      )
      if (!cliExists) {
        await storage.writeFile(
          projectPath,
          '.claude/skills/hub/scripts/issue-cli.js',
          HUB_ISSUE_CLI_TEMPLATE
        )
        created.push('.claude/skills/hub/scripts/issue-cli.js')
      }

      // 8. .claude/skills/hub/references/schemas.md (progressive disclosure)
      const schemasExists = await storage.exists(
        projectPath,
        '.claude/skills/hub/references/schemas.md'
      )
      if (!schemasExists) {
        await storage.writeFile(
          projectPath,
          '.claude/skills/hub/references/schemas.md',
          HUB_SKILL_SCHEMAS_TEMPLATE
        )
        created.push('.claude/skills/hub/references/schemas.md')
      }

      return created
    }

    const res = await fetch('/api/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    const data = await res.json()
    return data.created ?? []
  },
}
