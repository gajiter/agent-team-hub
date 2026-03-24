#!/usr/bin/env node

/**
 * Issue CLI — AI 에이전트가 이슈를 관리할 때 사용하는 CLI 도구.
 * 파일을 직접 수정하지 않고 이 CLI를 통해 일관된 포맷으로 이슈를 생성/수정/코멘트합니다.
 *
 * Usage:
 *   node scripts/issue-cli.js create --title "제목" --type bug --priority high [options]
 *   node scripts/issue-cli.js update ISS-001 --status in-progress --labels "a,b"
 *   node scripts/issue-cli.js comment ISS-001 --author claude --content "작업 완료"
 *   node scripts/issue-cli.js get ISS-001
 *   node scripts/issue-cli.js list [--status open] [--type bug]
 */

const fs = require('fs')
const path = require('path')

// __dirname = .claude/skills/hub/scripts → project root = 4 levels up
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..', '..')
const ISSUES_DIR = path.join(PROJECT_ROOT, 'issues')
const INDEX_PATH = path.join(ISSUES_DIR, '_index.json')

// ── Validation constants ──

const VALID_STATUS = ['open', 'in-progress', 'resolved', 'closed', 'archived']
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical']
const VALID_TYPE = ['task', 'bug', 'feature', 'question', 'decision']

// ── Helpers ──

function now() {
  return new Date().toISOString()
}

function padId(n) {
  return String(n).padStart(3, '0')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function issuePath(id) {
  return path.join(ISSUES_DIR, `${id}.json`)
}

function parseArgs(args) {
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
      result[key] = val
      if (val !== true) i++
    }
  }
  return result
}

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

function validate(value, allowed, fieldName) {
  if (value && !allowed.includes(value)) {
    fail(`Invalid ${fieldName}: "${value}". Allowed: ${allowed.join(', ')}`)
  }
}

// ── Commands ──

function cmdCreate(args) {
  const opts = parseArgs(args)

  if (!opts.title) fail('--title is required')
  if (!opts.type) fail('--type is required')

  validate(opts.type, VALID_TYPE, 'type')
  validate(opts.priority, VALID_PRIORITY, 'priority')
  validate(opts.status, VALID_STATUS, 'status')

  // Read and increment index
  const index = readJson(INDEX_PATH)
  const issueId = `ISS-${padId(index.nextId)}`
  const timestamp = now()

  const issue = {
    id: issueId,
    title: opts.title,
    description: opts.description || '',
    status: opts.status || 'open',
    priority: opts.priority || 'medium',
    type: opts.type,
    assignee: opts.assignee || '',
    assignees: opts.assignees ? opts.assignees.split(',').map(s => s.trim()) : [],
    reporter: opts.reporter || '',
    labels: opts.labels ? opts.labels.split(',').map(s => s.trim()) : [],
    relatedFiles: opts.relatedFiles ? opts.relatedFiles.split(',').map(s => s.trim()) : [],
    relatedIds: opts.relatedIds ? opts.relatedIds.split(',').map(s => s.trim()) : [],
    comments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeJson(issuePath(issueId), issue)

  index.nextId += 1
  writeJson(INDEX_PATH, index)

  console.log(JSON.stringify(issue, null, 2))
}

function cmdUpdate(args) {
  const issueId = args[0]
  if (!issueId || issueId.startsWith('--')) fail('Issue ID is required (e.g., ISS-001)')

  const opts = parseArgs(args.slice(1))
  const filePath = issuePath(issueId)

  if (!fs.existsSync(filePath)) fail(`Issue not found: ${issueId}`)

  validate(opts.status, VALID_STATUS, 'status')
  validate(opts.priority, VALID_PRIORITY, 'priority')
  validate(opts.type, VALID_TYPE, 'type')

  const issue = readJson(filePath)

  // Immutable fields
  const IMMUTABLE = ['id', 'createdAt', 'reporter', 'comments']

  // Updatable fields (scalar)
  const SCALAR_FIELDS = ['title', 'description', 'status', 'priority', 'type', 'assignee']
  // Updatable fields (array, comma-separated)
  const ARRAY_FIELDS = ['assignees', 'labels', 'relatedFiles', 'relatedIds']

  let changed = false

  for (const key of SCALAR_FIELDS) {
    if (opts[key] !== undefined) {
      if (IMMUTABLE.includes(key)) {
        fail(`Cannot modify immutable field: ${key}`)
      }
      issue[key] = opts[key]
      changed = true
    }
  }

  for (const key of ARRAY_FIELDS) {
    if (opts[key] !== undefined) {
      issue[key] = opts[key].split(',').map(s => s.trim())
      changed = true
    }
  }

  if (!changed) fail('No fields to update. Use --field value to update fields.')

  issue.updatedAt = now()
  writeJson(filePath, issue)

  console.log(JSON.stringify(issue, null, 2))
}

function cmdComment(args) {
  const issueId = args[0]
  if (!issueId || issueId.startsWith('--')) fail('Issue ID is required (e.g., ISS-001)')

  const opts = parseArgs(args.slice(1))

  if (!opts.author) fail('--author is required')
  if (!opts.content) fail('--content is required')

  const filePath = issuePath(issueId)
  if (!fs.existsSync(filePath)) fail(`Issue not found: ${issueId}`)

  const issue = readJson(filePath)
  const timestamp = now()

  const comment = {
    id: `c-${Date.now()}`,
    author: opts.author,
    content: opts.content,
    createdAt: timestamp,
  }

  issue.comments.push(comment)
  issue.updatedAt = timestamp
  writeJson(filePath, issue)

  console.log(JSON.stringify(comment, null, 2))
}

function cmdGet(args) {
  const issueId = args[0]
  if (!issueId) fail('Issue ID is required (e.g., ISS-001)')

  const filePath = issuePath(issueId)
  if (!fs.existsSync(filePath)) fail(`Issue not found: ${issueId}`)

  const issue = readJson(filePath)
  console.log(JSON.stringify(issue, null, 2))
}

function cmdList(args) {
  const opts = parseArgs(args)

  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.startsWith('ISS-') && f.endsWith('.json'))
  let issues = files.map(f => readJson(path.join(ISSUES_DIR, f)))

  if (opts.status) {
    validate(opts.status, VALID_STATUS, 'status')
    issues = issues.filter(i => i.status === opts.status)
  }
  if (opts.type) {
    validate(opts.type, VALID_TYPE, 'type')
    issues = issues.filter(i => i.type === opts.type)
  }
  if (opts.priority) {
    validate(opts.priority, VALID_PRIORITY, 'priority')
    issues = issues.filter(i => i.priority === opts.priority)
  }
  if (opts.assignee) {
    issues = issues.filter(i => i.assignee === opts.assignee)
  }
  if (opts.label) {
    issues = issues.filter(i => i.labels && i.labels.includes(opts.label))
  }

  // Summary output
  const summary = issues.map(i => ({
    id: i.id,
    title: i.title,
    status: i.status,
    priority: i.priority,
    type: i.type,
    assignee: i.assignee,
  }))

  console.log(JSON.stringify(summary, null, 2))
}

// ── Main ──

const [command, ...args] = process.argv.slice(2)

const commands = { create: cmdCreate, update: cmdUpdate, comment: cmdComment, get: cmdGet, list: cmdList }

if (!command || !commands[command]) {
  console.log(`Usage: issue-cli <command> [options]

Commands:
  create   Create a new issue
           --title (required) --type (required) --priority --status
           --description --assignee --assignees --reporter
           --labels --relatedFiles --relatedIds

  update   Update an existing issue
           issue-cli update ISS-001 --status resolved --priority high
           Updatable: title, description, status, priority, type,
                      assignee, assignees, labels, relatedFiles, relatedIds

  comment  Add a comment to an issue
           issue-cli comment ISS-001 --author claude --content "내용"

  get      Read an issue
           issue-cli get ISS-001

  list     List issues with optional filters
           --status --type --priority --assignee --label`)
  process.exit(command ? 1 : 0)
}

commands[command](args)
