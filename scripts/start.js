#!/usr/bin/env node
const { execSync } = require('child_process')
const path = require('path')

console.log('Starting agent-team-hub...')
execSync('npx next dev', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
})
