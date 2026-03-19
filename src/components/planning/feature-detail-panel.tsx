'use client'

import { useMemo } from 'react'
import type { Feature, Requirement, Relation } from '@/types/features'
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const RELATION_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  depends: { label: '의존', className: 'bg-red-50 text-red-600 border-red-200' },
  related: { label: '관련', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  extends: { label: '확장', className: 'bg-green-50 text-green-600 border-green-200' },
}

interface FeatureDetailPanelProps {
  feature: Feature
  breadcrumb: string[]
  allFeatures: Feature[]
  allRequirements: Requirement[]
  relations: Relation[]
  onSwitchToTree?: () => void
  onSelectFeature: (id: string) => void
  onSelectRequirement?: (id: string) => void
}

export default function FeatureDetailPanel({
  feature,
  breadcrumb,
  allFeatures,
  allRequirements,
  relations,
  onSwitchToTree,
  onSelectFeature,
  onSelectRequirement,
}: FeatureDetailPanelProps) {
  const childFeatureItems = useMemo(
    () => allFeatures.filter(f => f.parentId === feature.id),
    [allFeatures, feature.id]
  )

  const dependencyItems = useMemo(
    () => feature.dependencies
      .map(fId => allFeatures.find(f => f.id === fId))
      .filter(Boolean) as Feature[],
    [allFeatures, feature.dependencies]
  )

  const featureRelations = useMemo(() => {
    return relations
      .filter(r => (r.from === feature.id || r.to === feature.id) && r.from.startsWith('F-') && r.to.startsWith('F-'))
      .map(r => {
        const isOutgoing = r.from === feature.id
        const targetId = isOutgoing ? r.to : r.from
        const targetFeat = allFeatures.find(f => f.id === targetId)
        return { ...r, isOutgoing, targetId, targetName: targetFeat?.name ?? targetId }
      })
  }, [relations, feature.id, allFeatures])

  const parentReq = allRequirements.find(r => r.id === feature.requirementId)
  const isDetailedSpec = feature.parentId !== null

  return (
    <ScrollArea className="flex-1 min-w-0">
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : ''}>{crumb}</span>
            </span>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-1">{feature.name}</h2>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            {isDetailedSpec ? '상세 기능' : '기능'}
          </Badge>
          {parentReq && onSelectRequirement && (
            <button onClick={() => onSelectRequirement(parentReq.id)} className="text-xs text-primary hover:underline">
              {parentReq.id} {parentReq.name}
            </button>
          )}
        </div>

        {onSwitchToTree && (
          <button
            onClick={onSwitchToTree}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-5 bg-muted/50 border border-border rounded-md px-2.5 py-1.5"
          >
            <span>&#x2197;</span>
            <span>트리 뷰로 이동</span>
          </button>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">ID</div>
            <span className="font-mono text-foreground">{feature.id}</span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">상태</div>
            <StatusBadge status={feature.status} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">중요도</div>
            <PriorityBadge priority={feature.priority} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Phase</div>
            <span className="text-foreground">Phase {feature.phase}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <div className="text-sm font-medium text-foreground mb-2">설명 및 상세 요구사항</div>
          <div className="text-sm text-muted-foreground leading-relaxed p-4 bg-muted/50 rounded-lg border border-border/50">
            {feature.description}
          </div>
        </div>

        {/* User Stories */}
        {feature.userStories.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-2">연결된 유저 스토리</div>
            <div className="flex flex-wrap gap-2">
              {feature.userStories.map(us => (
                <span key={us} className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md">
                  {us}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Acceptance Criteria */}
        {feature.acceptanceCriteria.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">수용 기준</div>
            <div className="space-y-0 border border-border rounded-lg overflow-hidden">
              {feature.acceptanceCriteria.map((ac, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 bg-card hover:bg-muted/30 transition-colors">
                  <div className="w-4 h-4 border-2 border-border rounded mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1 leading-relaxed">{ac}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Child Features */}
        {childFeatureItems.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">상세 기능</div>
            <div className="space-y-2">
              {childFeatureItems.map(cf => (
                <button
                  key={cf.id}
                  onClick={() => onSelectFeature(cf.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="text-xs font-mono text-muted-foreground w-12">{cf.id}</span>
                  <span className="text-sm text-foreground flex-1">{cf.name}</span>
                  <PriorityBadge priority={cf.priority} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature-level Relations */}
        {featureRelations.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">기능 간 관계</div>
            <div className="space-y-2">
              {featureRelations.map((rel, i) => {
                const typeInfo = RELATION_TYPE_LABELS[rel.type] ?? RELATION_TYPE_LABELS.related
                return (
                  <button
                    key={i}
                    onClick={() => onSelectFeature(rel.targetId)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="text-xs text-muted-foreground">{rel.isOutgoing ? '→' : '←'}</span>
                    <Badge variant="outline" className={`text-[10px] ${typeInfo.className}`}>{typeInfo.label}</Badge>
                    <span className="text-xs font-mono text-muted-foreground">{rel.targetId}</span>
                    <span className="text-sm text-foreground flex-1">{rel.targetName}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {dependencyItems.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">선행 의존</div>
            <div className="space-y-2">
              {dependencyItems.map(df => (
                <button
                  key={df.id}
                  onClick={() => onSelectFeature(df.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="text-xs font-mono text-muted-foreground w-12">{df.id}</span>
                  <span className="text-sm text-foreground flex-1">{df.name}</span>
                  <PriorityBadge priority={df.priority} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
