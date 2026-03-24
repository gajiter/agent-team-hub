#!/usr/bin/env node

/**
 * Generates src/lib/templates-bundled.ts from src/templates/ files.
 * Run after modifying any template file.
 */

const fs = require('fs')
const path = require('path')

const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'templates')
const OUTPUT = path.join(__dirname, '..', 'src', 'lib', 'templates-bundled.ts')

function escapeTemplate(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function readTemplate(relativePath) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, relativePath), 'utf-8')
}

const claudeMd = readTemplate('claude-md-section.md').trimEnd()
const workflow = readTemplate('hub-workflow.md').trimEnd()
const skill = readTemplate('hub-skill/SKILL.md').trimEnd()
const schemas = readTemplate('hub-skill/references/schemas.md').trimEnd()
const issueCli = readTemplate('hub-skill/scripts/issue-cli.js').trimEnd()

const output = `// Auto-generated from src/templates/ — do not edit manually.
// Run: node scripts/bundle-templates.js

export const CLAUDE_MD_SECTION = \`${escapeTemplate(claudeMd)}\`

export const HUB_WORKFLOW_TEMPLATE = \`${escapeTemplate(workflow)}\`

export const HUB_SKILL_TEMPLATE = \`${escapeTemplate(skill)}\`

export const HUB_SKILL_SCHEMAS_TEMPLATE = \`${escapeTemplate(schemas)}\`

export const HUB_ISSUE_CLI_TEMPLATE = \`${escapeTemplate(issueCli)}\`
`

fs.writeFileSync(OUTPUT, output, 'utf-8')
console.log('Generated:', OUTPUT)
