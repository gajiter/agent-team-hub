'use client'

import { useMemo } from 'react'
import type { Requirement, Feature, Relation } from '@/types/features'
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const GROUP_LABELS: Record<string, { label: string; className: string }> = {
  tenant: { label: 'Tenant', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  admin: { label: 'Admin', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  platform: { label: 'Platform', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const RELATION_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  depends: { label: '의존', className: 'bg-red-50 text-red-600 border-red-200' },
  related: { label: '관련', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  extends: { label: '확장', className: 'bg-green-50 text-green-600 border-green-200' },
}

interface RequirementDetailPanelProps {
  requirement: Requirement
  features: Feature[]
  allRequirements: Requirement[]
  relations: Relation[]
  onSelectFeature: (id: string) => void
  onSelectRequirement: (id: string) => void
  onSwitchToTree?: () => void
}

export default function RequirementDetailPanel({
  requirement,
  features,
  allRequirements,
  relations,
  onSelectFeature,
  onSelectRequirement,
  onSwitchToTree,
}: RequirementDetailPanelProps) {
  const rootFeatures = useMemo(
    () => features.filter(f => f.requirementId === requirement.id && f.parentId === null),
    [features, requirement.id]
  )

  const allReqFeatures = useMemo(
    () => features.filter(f => f.requirementId === requirement.id),
    [features, requirement.id]
  )

  const reqRelations = useMemo(() => {
    return relations
      .filter(r => (r.from === requirement.id || r.to === requirement.id) && r.from.startsWith('REQ-') && r.to.startsWith('REQ-'))
      .map(r => {
        const isOutgoing = r.from === requirement.id
        const targetId = isOutgoing ? r.to : r.from
        const targetReq = allRequirements.find(rq => rq.id === targetId)
        return { ...r, isOutgoing, targetId, targetName: targetReq?.name ?? targetId }
      })
  }, [relations, requirement.id, allRequirements])

  const group = GROUP_LABELS[requirement.group] ?? GROUP_LABELS.tenant

  return (
    <ScrollArea className="flex-1 min-w-0">
      <div className="p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="font-mono">{requirement.id}</span>
          <span>/</span>
          <span className="text-foreground font-medium">요구사항</span>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-3">{requirement.name}</h2>

        {onSwitchToTree && (
          <button
            onClick={onSwitchToTree}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-5 bg-muted/50 border border-border rounded-md px-2.5 py-1.5"
          >
            <span>&#x2197;</span>
            <span>트리 뷰로 이동</span>
          </button>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">그룹</div>
            <Badge variant="outline" className={`text-xs ${group.className}`}>{group.label}</Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">상태</div>
            <StatusBadge status={requirement.status} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">중요도</div>
            <PriorityBadge priority={requirement.priority} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">기능 수</div>
            <span className="text-foreground">{allReqFeatures.length}개</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-medium text-foreground mb-2">요구사항 설명</div>
          <div className="text-sm text-muted-foreground leading-relaxed p-4 bg-muted/50 rounded-lg border border-border/50">
            {requirement.description}
          </div>
        </div>

        {requirement.acceptanceCriteria.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">수용 기준</div>
            <div className="space-y-0 border border-border rounded-lg overflow-hidden">
              {requirement.acceptanceCriteria.map((ac, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 bg-card hover:bg-muted/30 transition-colors">
                  <div className="w-4 h-4 border-2 border-border rounded mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1 leading-relaxed">{ac}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {reqRelations.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">요구사항 간 관계</div>
            <div className="space-y-2">
              {reqRelations.map((rel, i) => {
                const typeInfo = RELATION_TYPE_LABELS[rel.type] ?? RELATION_TYPE_LABELS.related
                return (
                  <button
                    key={i}
                    onClick={() => onSelectRequirement(rel.targetId)}
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

        {rootFeatures.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-foreground mb-3">기능 목록</div>
            <div className="space-y-2">
              {rootFeatures.map(f => {
                const childCount = features.filter(cf => cf.parentId === f.id).length
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelectFeature(f.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-12">{f.id}</span>
                    <span className="text-sm text-foreground flex-1">{f.name}</span>
                    {childCount > 0 && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{childCount} 상세</span>
                    )}
                    <PriorityBadge priority={f.priority} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
