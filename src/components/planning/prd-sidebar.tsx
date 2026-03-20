'use client'

import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import type { PrdSections } from '@/types/prd'

const SECTIONS = [
  { id: 'overview', icon: '📊', labelKey: 'planning.prd.overview' },
  { id: 'vision', icon: '📘', labelKey: 'planning.prd.productVision' },
  { id: 'coreValues', icon: '★', labelKey: 'planning.prd.coreValues' },
  { id: 'target', icon: '👤', labelKey: 'planning.prd.targetUsers' },
  { id: 'userStories', icon: '📋', labelKey: 'planning.prd.userStories' },
  { id: 'nonFunctional', icon: '⚙', labelKey: 'planning.prd.nfr' },
  { id: 'mvpScope', icon: '🎯', labelKey: 'planning.prd.mvpScope' },
  { id: 'roadmap', icon: '🗓', labelKey: 'planning.prd.roadmap' },
  { id: 'kpi', icon: '◎', labelKey: 'planning.prd.successMetrics' },
  { id: 'constraints', icon: '⚠', labelKey: 'planning.prd.constraints' },
  { id: 'openItems', icon: '❓', labelKey: 'planning.prd.openItems' },
  { id: 'metadata', icon: '✓', labelKey: 'planning.prd.docInfo' },
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
  const { t } = useI18n()

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
            <span className="flex-1 truncate">{t(s.labelKey)}</span>
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
