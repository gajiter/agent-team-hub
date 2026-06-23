'use client'

import { useProject } from '@/hooks/use-project'

export default function OfficeView() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? ''

  if (!projectId) return null

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={`/office/index.html?projectId=${encodeURIComponent(projectId)}`}
        className="w-full h-full border-0"
        style={{ imageRendering: 'pixelated' }}
        title="Team Office"
      />
    </div>
  )
}
