export function safeParseJson<T>(text: string): T | null {
  try { return JSON.parse(text) } catch { return null }
}

export function parseFrontmatter(content: string): { metadata: Record<string, any>, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { metadata: {}, body: content }
  const metaLines = match[1].split('\n')
  const metadata: Record<string, any> = {}
  let currentKey = ''
  for (const line of metaLines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const value = kvMatch[2].trim()
      if (value.startsWith('[') || value.startsWith('"')) {
        try { metadata[currentKey] = JSON.parse(value) } catch { metadata[currentKey] = value.replace(/^"|"$/g, '') }
      } else {
        metadata[currentKey] = value.replace(/^"|"$/g, '')
      }
    } else if (line.trim().startsWith('- ') && currentKey) {
      if (!Array.isArray(metadata[currentKey])) metadata[currentKey] = []
      metadata[currentKey].push(line.trim().slice(2).replace(/^"|"$/g, ''))
    }
  }
  return { metadata, body: match[2] }
}
