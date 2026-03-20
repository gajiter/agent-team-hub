'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Topbar } from '@/components/layout/topbar'
import PrdSidebar, { SECTIONS } from '@/components/planning/prd-sidebar'
import PrdSection, { Field } from '@/components/planning/prd-section'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProject } from '@/hooks/use-project'
import { useI18n } from '@/lib/i18n'
import { fileService } from '@/lib/services/file-service'
import type { PrdData, PrdSections } from '@/types/prd'

const FALLBACK_SECTIONS: PrdSections = {
  vision: { oneLiner: '', goals: [], background: [] },
  coreValues: [],
  target: { userTypes: [], personas: [], scenarios: [] },
  userStories: [],
  nonFunctionalRequirements: { performance: [], security: [], deployment: [], dataManagement: [] },
  mvpScope: { included: [], excluded: [] },
  roadmap: [],
  kpi: { operationalStability: [], usability: [], business: [] },
  constraints: [],
  openIssues: [],
  properties: { serviceName: '', version: '', status: '', basedOn: '' },
}

const FALLBACK_PRD: PrdData = {
  version: '2.0',
  project: '',
  updatedAt: '',
  progress: 0,
  sections: FALLBACK_SECTIONS,
}

function SizeBadge({ size }: { size: string }) {
  const variant = size === 'Large' ? 'destructive' : size === 'Medium' ? 'default' : 'secondary'
  return <Badge variant={variant}>{size}</Badge>
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{value}%</span>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function StoryRefBadge({ storyId, onClick }: { storyId: string; onClick: (id: string) => void }) {
  return (
    <Badge
      variant="secondary"
      className="text-xs font-mono cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
      onClick={(e) => { e.stopPropagation(); onClick(storyId) }}
    >
      {storyId}
    </Badge>
  )
}

export default function PrdPage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null
  const { t } = useI18n()

  const [activeSection, setActiveSection] = useState('overview')
  const [prd, setPrd] = useState<PrdData>(FALLBACK_PRD)
  const [dataExists, setDataExists] = useState(true)
  const [highlightedStory, setHighlightedStory] = useState<string | null>(null)
  const [storyFilter, setStoryFilter] = useState<string | null>(null)
  const storyRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!projectId) return
    fileService.readFile(projectId, 'data/prd.json')
      .then(({ content, exists }) => {
        setDataExists(exists)
        if (exists) {
          try {
            const parsed = JSON.parse(content)
            const sections = parsed.sections ?? {}
            setPrd({
              ...FALLBACK_PRD,
              ...parsed,
              sections: {
                ...FALLBACK_SECTIONS,
                ...sections,
                vision: { ...FALLBACK_SECTIONS.vision, ...sections.vision },
                target: { ...FALLBACK_SECTIONS.target, ...sections.target },
                nonFunctionalRequirements: { ...FALLBACK_SECTIONS.nonFunctionalRequirements, ...sections.nonFunctionalRequirements },
                mvpScope: { ...FALLBACK_SECTIONS.mvpScope, ...sections.mvpScope },
                kpi: { ...FALLBACK_SECTIONS.kpi, ...sections.kpi },
                properties: { ...FALLBACK_SECTIONS.properties, ...sections.properties },
              },
            })
          } catch { /* fallback */ }
        }
      })
      .catch(() => {})
  }, [projectId])

  const navigateToStory = useCallback((storyId: string) => {
    setActiveSection('userStories')
    setStoryFilter(null)
    setHighlightedStory(storyId)
    setTimeout(() => {
      storyRefs.current[storyId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightedStory(null), 2000)
    }, 100)
  }, [])

  if (!projectId) {
    return (
      <>
        <Topbar title={t('planning.prd.title')} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('common.selectProjectShort')}</div>
      </>
    )
  }

  if (!dataExists) {
    return (
      <>
        <Topbar title={t('planning.prd.title')} />
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <span className="text-3xl">📋</span>
          <p className="text-sm">{t('planning.prd.noData')}</p>
          <p className="text-xs">{t('planning.prd.addFile')}</p>
        </div>
      </>
    )
  }

  const sec = SECTIONS.find(s => s.id === activeSection)
  const s = prd.sections

  return (
    <>
      <Topbar
        title={t('planning.prd.title')}
        subtitle={s.properties.serviceName || `v${prd.version}`}
        right={
          <div className="flex items-center gap-3">
            <ProgressBar value={prd.progress} />
            <Badge variant="outline">{s.properties.status || t('common.loading')}</Badge>
            <span className="text-xs text-muted-foreground">{prd.updatedAt}</span>
          </div>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <PrdSidebar activeSection={activeSection} onSelect={setActiveSection} sections={s} />
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl">
            {sec && renderSection(activeSection, sec.icon, t(sec.labelKey), s, navigateToStory, highlightedStory, storyFilter, setStoryFilter, storyRefs, t)}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}

function renderSection(
  id: string,
  icon: string,
  title: string,
  s: PrdSections,
  navigateToStory: (id: string) => void,
  highlightedStory: string | null,
  storyFilter: string | null,
  setStoryFilter: (filter: string | null) => void,
  storyRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (id) {
    case 'overview':
      return <OverviewSection s={s} t={t} />

    case 'vision': {
      const backgrounds = Array.isArray(s.vision.background) ? s.vision.background : [s.vision.background]
      return (
        <PrdSection icon={icon} title={title}>
          <div className="mt-4 text-base font-medium text-foreground leading-relaxed px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
            {s.vision.oneLiner}
          </div>
          <div className="mt-6">
            <div className="text-sm font-medium text-muted-foreground mb-2">{t('planning.prd.background')}</div>
            <div className="space-y-2">
              {backgrounds.filter(Boolean).map((bg, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-foreground leading-relaxed px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-amber-500/50">
                  <span className="text-amber-500 mt-0.5 shrink-0 font-medium">{i + 1}</span>
                  <span>{bg}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="text-sm font-medium text-muted-foreground mb-2">{t('planning.prd.goals')}</div>
            <div className="space-y-2">
              {s.vision.goals.map((g, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-foreground leading-relaxed px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-primary/30">
                  <span className="text-primary mt-0.5 shrink-0 font-medium">{i + 1}</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </PrdSection>
      )
    }

    case 'coreValues':
      return (
        <PrdSection icon={icon} title={title}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {s.coreValues.map((v) => (
              <div key={v.id} className="px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-primary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{v.id}</Badge>
                  <span className="text-sm font-semibold text-foreground">{v.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">{v.description}</div>
              </div>
            ))}
          </div>
        </PrdSection>
      )

    case 'target':
      return (
        <>
          <PrdSection icon={icon} title={t('planning.prd.userTypes')}>
            <div className="mt-4 space-y-3">
              {s.target.userTypes.map((u, i) => (
                <div key={i} className="px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-primary/30">
                  <div className="text-sm font-semibold text-foreground mb-1">{u.role}</div>
                  <div className="text-sm text-muted-foreground mb-1">{u.description}</div>
                  <div className="text-xs text-primary">{t('planning.prd.keyConcerns')}: {u.concerns}</div>
                </div>
              ))}
            </div>
          </PrdSection>
          <PrdSection icon="👥" title={t('planning.prd.personas')}>
            <div className="mt-4 space-y-4">
              {s.target.personas.map((p, i) => (
                <div key={i} className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border/50">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    <Badge variant="outline" className="text-xs">{p.role}</Badge>
                  </div>
                  <div className="px-4 py-3 space-y-2.5 text-sm">
                    <div className="flex items-start gap-2"><span className="text-muted-foreground shrink-0 w-16">{t('planning.prd.situation')}</span><span className="text-foreground">{p.situation}</span></div>
                    <div className="flex items-start gap-2"><span className="text-muted-foreground shrink-0 w-16">{t('planning.prd.goal')}</span><span className="text-foreground">{p.goal}</span></div>
                    <div className="flex items-start gap-2"><span className="text-red-500 dark:text-red-400 shrink-0 w-16">{t('planning.prd.painPoint')}</span><span className="text-foreground">{p.painPoint}</span></div>
                    <div className="flex items-start gap-2"><span className="text-primary shrink-0 w-16 font-medium">{t('planning.prd.coreNeed')}</span><span className="text-foreground font-medium">{p.coreNeed}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </PrdSection>
          <PrdSection icon="🎬" title={t('planning.prd.coreScenarios')}>
            <div className="mt-4 space-y-2">
              {s.target.scenarios.map((scenario, i) => (
                <div key={i} className="text-sm text-foreground leading-relaxed px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-primary/30">
                  <span className="text-muted-foreground mr-2">{t('planning.prd.scenario')} {i + 1}:</span>{scenario}
                </div>
              ))}
            </div>
          </PrdSection>
        </>
      )

    case 'userStories': {
      const actors = [...new Set(s.userStories.map(us => us.actor))]
      const filtered = storyFilter ? s.userStories.filter(us => us.actor === storyFilter) : s.userStories
      return (
        <PrdSection icon={icon} title={title}>
          <div className="flex items-center gap-2 mt-3 mb-4">
            <span className="text-xs text-muted-foreground mr-1">{t('planning.prd.filter')}:</span>
            <Badge variant={storyFilter === null ? 'default' : 'outline'} className="text-xs cursor-pointer" onClick={() => setStoryFilter(null)}>{t('issues.all')} ({s.userStories.length})</Badge>
            {actors.map((actor) => (
              <Badge key={actor} variant={storyFilter === actor ? 'default' : 'outline'} className="text-xs cursor-pointer" onClick={() => setStoryFilter(storyFilter === actor ? null : actor)}>
                {actor} ({s.userStories.filter(us => us.actor === actor).length})
              </Badge>
            ))}
          </div>
          <div className="space-y-4">
            {filtered.map((us) => (
              <div key={us.id} ref={(el) => { storyRefs.current[us.id] = el }}
                className={`px-4 py-4 bg-muted/40 rounded-lg border-l-2 transition-all duration-500 ${highlightedStory === us.id ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-primary/30'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">{us.id}</Badge>
                  <span className="text-sm font-semibold text-foreground">{us.title}</span>
                  <SizeBadge size={us.size} />
                  <Badge variant="secondary" className="text-xs ml-auto">{us.actor}</Badge>
                </div>
                <div className="text-sm text-foreground mb-1">
                  {t('planning.prd.asA')} <span className="font-medium text-primary">{us.actor}</span> {t('planning.prd.iWantTo')}{' '}
                  <span className="font-medium">{us.goal}</span> {' '}
                  <span className="font-medium">{us.want}</span>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{t('planning.prd.acceptanceCriteria')}</div>
                  <div className="text-sm text-foreground px-3 py-2 bg-background/50 rounded border border-border/50 font-mono leading-relaxed space-y-1">
                    <div><span className="text-green-600 dark:text-green-400">Given </span>{us.acceptance.given}</div>
                    <div><span className="text-blue-600 dark:text-blue-400">When </span>{us.acceptance.when}</div>
                    <div><span className="text-amber-600 dark:text-amber-400">Then </span>{us.acceptance.then}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PrdSection>
      )
    }

    case 'nonFunctional': {
      const categories = [
        { key: 'performance' as const, label: t('planning.prd.performance'), color: 'border-blue-500/50' },
        { key: 'security' as const, label: t('planning.prd.security'), color: 'border-red-500/50' },
        { key: 'deployment' as const, label: t('planning.prd.deployment'), color: 'border-green-500/50' },
        { key: 'dataManagement' as const, label: t('planning.prd.dataManagement'), color: 'border-purple-500/50' },
      ]
      return (
        <PrdSection icon={icon} title={title}>
          <div className="mt-4 space-y-6">
            {categories.map(({ key, label, color }) => {
              const items = s.nonFunctionalRequirements[key]
              if (items.length === 0) return null
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-medium text-muted-foreground">{label}</div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className={`flex items-center justify-between text-sm px-4 py-2.5 bg-muted/40 rounded-lg border-l-2 ${color}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{item.id}</Badge>
                          <span className="text-foreground">{item.requirement}</span>
                        </div>
                        {item.target && <Badge variant="secondary" className="shrink-0 ml-2">{item.target}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </PrdSection>
      )
    }

    case 'mvpScope':
      return (
        <>
          <PrdSection icon={icon} title={t('planning.prd.included')}>
            <div className="flex items-center gap-2 mt-3 mb-3">
              <Badge variant="secondary" className="text-xs">{s.mvpScope.included.length}{t('planning.prd.items')}</Badge>
            </div>
            <div className="space-y-2">
              {s.mvpScope.included.map((inc) => (
                <div key={inc.id} className="flex items-start gap-2 text-sm text-foreground px-4 py-2.5 bg-muted/40 rounded-lg border-l-2 border-green-500/50">
                  <span className="text-green-500 mt-0.5 shrink-0">+</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{inc.id}</Badge>
                      <span>{inc.item}</span>
                    </div>
                    {inc.relatedStories.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {inc.relatedStories.map((sid) => (
                          <StoryRefBadge key={sid} storyId={sid} onClick={navigateToStory} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PrdSection>
          <PrdSection icon="🚫" title={t('planning.prd.excluded')}>
            <div className="space-y-2 mt-3">
              {s.mvpScope.excluded.map((ex, i) => (
                <div key={i} className="px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-destructive/50">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-destructive mt-0.5 shrink-0">-</span>
                    <div>
                      <span className="font-medium text-foreground">{ex.item}</span>
                      <div className="text-xs text-muted-foreground mt-1">{ex.reason}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PrdSection>
        </>
      )

    case 'roadmap':
      return (
        <PrdSection icon={icon} title={title}>
          <div className="mt-4 space-y-6">
            {s.roadmap.map((phase, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-primary/30 pb-2">
                <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-primary" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">Phase {phase.phase}</span>
                  {phase.targetDate ? <Badge variant="outline" className="text-xs">{phase.targetDate}</Badge> : <Badge variant="secondary" className="text-xs">{t('planning.prd.tbd')}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mb-2">{phase.title}</div>
                <ul className="space-y-1">
                  {phase.items.map((item, j) => (
                    <li key={j} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-muted-foreground mt-1 shrink-0">-</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PrdSection>
      )

    case 'kpi': {
      const kpiCategories = [
        { key: 'operationalStability' as const, label: t('planning.prd.operational'), color: 'border-green-500/50' },
        { key: 'usability' as const, label: t('planning.prd.usability'), color: 'border-blue-500/50' },
        { key: 'business' as const, label: t('planning.prd.business'), color: 'border-amber-500/50' },
      ]
      return (
        <PrdSection icon={icon} title={title}>
          <div className="mt-4 space-y-6">
            {kpiCategories.map(({ key, label, color }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-medium text-muted-foreground">{label}</div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{s.kpi[key].length}</Badge>
                </div>
                <div className="space-y-2">
                  {s.kpi[key].map((k, i) => (
                    <div key={i} className={`flex items-center justify-between text-sm px-4 py-2.5 bg-muted/40 rounded-lg border-l-2 ${color}`}>
                      <span className="text-foreground">{k.metric}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary">{k.target}</Badge>
                        <span className="text-xs text-muted-foreground">{k.period}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PrdSection>
      )
    }

    case 'constraints':
      return (
        <PrdSection icon={icon} title={title}>
          <div className="mt-4 rounded-lg border border-border/50 overflow-hidden">
            <div className="grid grid-cols-[80px_1fr] bg-muted/60 border-b border-border/50 text-xs font-medium text-muted-foreground">
              <div className="px-3 py-2.5">ID</div>
              <div className="px-3 py-2.5">{t('planning.prd.constraint')}</div>
            </div>
            {s.constraints.map((c, i) => (
              <div key={c.id} className={`grid grid-cols-[80px_1fr] text-sm ${i < s.constraints.length - 1 ? 'border-b border-border/30' : ''}`}>
                <div className="px-3 py-2.5"><Badge variant="outline" className="font-mono text-[10px]">{c.id}</Badge></div>
                <div className="px-3 py-2.5 text-foreground">{c.description}</div>
              </div>
            ))}
          </div>
        </PrdSection>
      )

    case 'openItems':
      return (
        <PrdSection icon={icon} title={title}>
          <div className="mt-4 rounded-lg border border-border/50 overflow-hidden">
            <div className="grid grid-cols-[80px_140px_1fr_1fr] bg-muted/60 border-b border-border/50 text-xs font-medium text-muted-foreground">
              <div className="px-3 py-2.5">ID</div>
              <div className="px-3 py-2.5">{t('planning.prd.item')}</div>
              <div className="px-3 py-2.5">{t('planning.prd.currentStatus')}</div>
              <div className="px-3 py-2.5">{t('planning.prd.prdImpact')}</div>
            </div>
            {s.openIssues.map((oi, i) => (
              <div key={oi.id} className={`grid grid-cols-[80px_140px_1fr_1fr] text-sm ${i < s.openIssues.length - 1 ? 'border-b border-border/30' : ''}`}>
                <div className="px-3 py-2.5"><Badge variant="outline" className="font-mono text-[10px]">{oi.id}</Badge></div>
                <div className="px-3 py-2.5 font-medium text-foreground">{oi.item}</div>
                <div className="px-3 py-2.5 text-muted-foreground">{oi.status}</div>
                <div className="px-3 py-2.5 text-primary text-xs">{oi.prdImpact}</div>
              </div>
            ))}
          </div>
        </PrdSection>
      )

    case 'metadata':
      return (
        <PrdSection icon={icon} title={title}>
          <Field label={t('planning.prd.serviceName')} value={s.properties.serviceName} />
          <Field label={t('planning.prd.version')} value={s.properties.version} />
          <Field label={t('planning.prd.status')} value={s.properties.status} />
          <Field label={t('planning.prd.basedOn')} value={s.properties.basedOn} />
        </PrdSection>
      )

    default:
      return null
  }
}

function OverviewSection({ s, t }: { s: PrdSections; t: (key: string, params?: Record<string, string | number>) => string }) {
  const nfrTotal = s.nonFunctionalRequirements.performance.length + s.nonFunctionalRequirements.security.length + s.nonFunctionalRequirements.deployment.length + s.nonFunctionalRequirements.dataManagement.length
  const kpiTotal = s.kpi.operationalStability.length + s.kpi.usability.length + s.kpi.business.length

  const sizeStats = {
    Small: s.userStories.filter(us => us.size === 'Small').length,
    Medium: s.userStories.filter(us => us.size === 'Medium').length,
    Large: s.userStories.filter(us => us.size === 'Large').length,
  }

  return (
    <PrdSection icon="📊" title={t('planning.prd.overview')}>
      <div className="mt-4">
        <div className="text-base font-medium text-foreground leading-relaxed mb-6 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          {s.vision.oneLiner || t('common.loading')}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon="📋" label={t('planning.prd.userStories')} value={s.userStories.length} />
          <StatCard icon="🎯" label={t('planning.prd.mvpIncluded')} value={s.mvpScope.included.length} />
          <StatCard icon="⚙" label={t('planning.prd.nfr')} value={nfrTotal} />
          <StatCard icon="❓" label={t('planning.prd.openItems')} value={s.openIssues.length} />
        </div>
        <div className="mb-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">{t('planning.prd.storySizeDistribution')}</div>
          <div className="flex gap-2 items-center">
            {Object.entries(sizeStats).map(([size, count]) => {
              if (count === 0) return null
              const total = s.userStories.length
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={size} className="flex items-center gap-1.5">
                  <SizeBadge size={size} />
                  <span className="text-sm text-foreground font-medium">{count}</span>
                  <span className="text-xs text-muted-foreground">({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mb-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">{t('planning.prd.coreValues')}</div>
          <div className="flex flex-wrap gap-2">
            {s.coreValues.map((v) => <Badge key={v.id} variant="outline" className="text-xs">{v.name}</Badge>)}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>{t('planning.prd.constraints')} <strong className="text-foreground">{s.constraints.length}</strong></span>
            <span>{t('planning.prd.kpiMetrics')} <strong className="text-foreground">{kpiTotal}</strong></span>
            <span>{t('planning.prd.excluded')} <strong className="text-foreground">{s.mvpScope.excluded.length}</strong></span>
            <span>{t('planning.prd.personas')} <strong className="text-foreground">{s.target.personas.length}</strong></span>
          </div>
        </div>
      </div>
    </PrdSection>
  )
}
