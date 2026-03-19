'use client'

import { Badge } from '@/components/ui/badge'
import type { PrdSections } from '@/types/prd'

const SECTIONS = [
  { id: 'overview', icon: '📊', label: '개요' },
  { id: 'vision', icon: '📘', label: '제품 비전' },
  { id: 'coreValues', icon: '★', label: '핵심 가치' },
  { id: 'target', icon: '👤', label: '타겟 사용자' },
  { id: 'userStories', icon: '📋', label: '사용자 스토리' },
  { id: 'nonFunctional', icon: '⚙', label: '비기능 요구사항' },
  { id: 'mvpScope', icon: '🎯', label: 'MVP 범위' },
  { id: 'roadmap', icon: '🗓', label: '로드맵' },
  { id: 'kpi', icon: '◎', label: '성공 지표' },
  { id: 'constraints', icon: '⚠', label: '제약 조건' },
  { id: 'openItems', icon: '❓', label: '미결 사항' },
  { id: 'metadata', icon: '✓', label: '문서 정보' },
]

function getSectionCount(id: string, sections: PrdSections | null): number | null {
  if (!sections) return null
  switch (id) {
    case 'coreValues': return sections.coreValues.length
    case 'target': return sections.target.userTypes.length + sections.target.personas.length
    case 'userStories': return sections.userStories.length
    case 'nonFunctional': {
      const nfr = sections.nonFunctionalRequirements
      return nfr.performance.length + nfr.security.length + nfr.deployment.length + nfr.dataManagement.length
    }
    case 'mvpScope': return sections.mvpScope.included.length + sections.mvpScope.excluded.length
    case 'roadmap': return sections.roadmap.length
    case 'kpi': {
      const kpi = sections.kpi
      return kpi.operationalStability.length + kpi.usability.length + kpi.business.length
    }
    case 'constraints': return sections.constraints.length
    case 'openItems': return sections.openIssues.length
    default: return null
  }
}

interface PrdSidebarProps {
  activeSection: string
  onSelect: (id: string) => void
  sections?: PrdSections | null
}

export default function PrdSidebar({ activeSection, onSelect, sections = null }: PrdSidebarProps) {
  return (
    <div className="w-52 min-w-52 border-r border-border bg-sidebar flex flex-col py-4 px-3 overflow-y-auto">
      {SECTIONS.map(s => {
        const count = getSectionCount(s.id, sections)
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left mb-1 transition-colors w-full ${
              activeSection === s.id
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="text-base shrink-0">{s.icon}</span>
            <span className="flex-1 truncate">{s.label}</span>
            {count !== null && count > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {count}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { SECTIONS }
