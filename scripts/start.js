#!/usr/bin/env node
const { execSync } = require('child_process')
const path = require('path')

console.log('Starting agent-team-hub...')
execSync('npx next dev --port 3100', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
})
