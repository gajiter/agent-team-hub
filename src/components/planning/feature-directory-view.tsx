'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Feature, Requirement, Relation } from '@/types/features'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PriorityBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import FeatureDetailPanel from './feature-detail-panel'
import RequirementDetailPanel from './requirement-detail-panel'

interface FeatureDirectoryViewProps {
  features: Feature[]
  requirements: Requirement[]
  relations: Relation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onSwitchToTree?: () => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
}

const GROUP_BADGE: Record<string, { label: string; className: string }> = {
  tenant: { label: 'T', className: 'bg-blue-100 text-blue-600' },
  admin: { label: 'A', className: 'bg-purple-100 text-purple-600' },
  platform: { label: 'P', className: 'bg-emerald-100 text-emerald-600' },
}

export default function FeatureDirectoryView({
  features,
  requirements,
  relations,
  selectedId,
  onSelect,
  onSwitchToTree,
}: FeatureDirectoryViewProps) {
  const [selectedReqId, setSelectedReqId] = useState<string | null>(requirements[0]?.id ?? null)
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!selectedId) return
    if (selectedId.startsWith('REQ-')) {
      setSelectedReqId(selectedId)
      return
    }
    const feature = features.find(f => f.id === selectedId)
    if (feature && feature.requirementId !== selectedReqId) {
      setSelectedReqId(feature.requirementId)
    }
  }, [selectedId, features]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedRequirements = useMemo(
    () => [...requirements].sort((a, b) => a.order - b.order),
    [requirements]
  )

  const reqFeatureMap = useMemo(() => {
    const map = new Map<string, Feature[]>()
    for (const req of requirements) {
      map.set(req.id, features.filter(f => f.requirementId === req.id))
    }
    return map
  }, [features, requirements])

  const currentRootFeatures = useMemo(() => {
    if (!selectedReqId) return []
    return features.filter(f => f.requirementId === selectedReqId && f.parentId === null)
  }, [features, selectedReqId])

  const getChildFeatures = (featureId: string): Feature[] => {
    return features.filter(f => f.parentId === featureId)
  }

  const handleSelect = (id: string) => {
    if (id.startsWith('REQ-')) {
      setSelectedReqId(id)
    } else {
      const feature = features.find(f => f.id === id)
      if (feature) {
        setSelectedReqId(feature.requirementId)
      }
    }
    onSelect(id)
  }

  const toggleExpand = (featureId: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(featureId)) next.delete(featureId)
      else next.add(featureId)
      return next
    })
  }

  const breadcrumb = useMemo(() => {
    if (!selectedId || selectedId.startsWith('REQ-')) return []
    const selectedFeature = features.find(f => f.id === selectedId)
    if (!selectedFeature) return []
    const req = requirements.find(r => r.id === selectedFeature.requirementId)
    const parts: string[] = [req?.name ?? selectedFeature.requirementId]
    const ancestors: string[] = []
    let current = selectedFeature
    while (current.parentId) {
      const parent = features.find(f => f.id === current.parentId)
      if (!parent) break
      ancestors.unshift(parent.name)
      current = parent
    }
    parts.push(...ancestors)
    parts.push(selectedFeature.name)
    return parts
  }, [selectedId, requirements, features])

  const selectedReq = selectedId?.startsWith('REQ-') ? requirements.find(r => r.id === selectedId) : null
  const selectedFeature = selectedId && !selectedId.startsWith('REQ-') ? features.find(f => f.id === selectedId) : null

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Requirements */}
      <div className="w-64 min-w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">요구사항</div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {sortedRequirements.map(req => {
              const reqFeatures = reqFeatureMap.get(req.id) ?? []
              const isActive = selectedReqId === req.id
              const isDetailSelected = selectedId === req.id
              const group = GROUP_BADGE[req.group] ?? GROUP_BADGE.tenant
              return (
                <div key={req.id} className="mb-1">
                  <button
                    onClick={() => {
                      setSelectedReqId(req.id)
                      if (isActive) onSelect(req.id)
                    }}
                    onDoubleClick={() => onSelect(req.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isDetailSelected
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        : isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50 text-foreground'
                    }`}
                  >
                    <span className={`text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${group.className}`}>
                      {group.label}
                    </span>
                    <span className="text-sm flex-1 truncate">{req.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{reqFeatures.length}</span>
                  </button>
                  {isActive && !isDetailSelected && (
                    <button onClick={() => onSelect(req.id)} className="w-full text-left px-3 py-1 text-[11px] text-primary hover:underline">
                      요구사항 상세 보기 →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Middle: Features tree */}
      <div className="w-72 min-w-72 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">기능 / 상세 기능</div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {currentRootFeatures.map(f => {
              const children = getChildFeatures(f.id)
              const isExpanded = expandedFeatures.has(f.id)
              const isSelected = selectedId === f.id
              const hasChildren = children.length > 0
              return (
                <div key={f.id} className="mb-1">
                  <div className="flex items-center gap-1">
                    {hasChildren ? (
                      <button onClick={() => toggleExpand(f.id)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                        <span className="text-xs transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>&#x25B6;</span>
                      </button>
                    ) : (
                      <div className="w-5 flex-shrink-0" />
                    )}
                    <button
                      onClick={() => onSelect(f.id)}
                      className={`flex-1 flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
                    >
                      <div className="flex gap-0.5 flex-shrink-0">
                        <div className="w-0.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[f.priority] || '#6b7280' }} />
                        <div className="w-0.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[f.priority] || '#6b7280', opacity: 0.5 }} />
                      </div>
                      <span className="text-sm truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{hasChildren ? children.length : ''}</span>
                    </button>
                  </div>
                  {isExpanded && children.length > 0 && (
                    <div className="ml-6 mt-0.5 mb-1 border-l-2 border-border pl-2">
                      {children.map(cf => {
                        const isSubSelected = selectedId === cf.id
                        const grandChildren = getChildFeatures(cf.id)
                        const hasGrandChildren = grandChildren.length > 0
                        const isSubExpanded = expandedFeatures.has(cf.id)
                        return (
                          <div key={cf.id} className="mb-0.5">
                            <div className="flex items-center gap-1">
                              {hasGrandChildren ? (
                                <button onClick={() => toggleExpand(cf.id)} className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
                                  <span className="text-[10px] transition-transform" style={{ transform: isSubExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>&#x25B6;</span>
                                </button>
                              ) : (
                                <div className="w-4 flex-shrink-0" />
                              )}
                              <button
                                onClick={() => handleSelect(cf.id)}
                                className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${isSubSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
                              >
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <div className="w-0.5 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[cf.priority] || '#6b7280' }} />
                                  <div className="w-0.5 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[cf.priority] || '#6b7280', opacity: 0.5 }} />
                                </div>
                                <span className="text-xs truncate flex-1">{cf.name}</span>
                                {hasGrandChildren && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded-full flex-shrink-0">{grandChildren.length}</span>
                                )}
                              </button>
                            </div>
                            {isSubExpanded && grandChildren.length > 0 && (
                              <div className="ml-5 mt-0.5 mb-0.5 border-l-2 border-border/60 pl-2">
                                {grandChildren.map(gc => (
                                  <button
                                    key={gc.id}
                                    onClick={() => handleSelect(gc.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors mb-0.5 ${selectedId === gc.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
                                  >
                                    <div className="flex gap-0.5 flex-shrink-0">
                                      <div className="w-0.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[gc.priority] || '#6b7280' }} />
                                      <div className="w-0.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[gc.priority] || '#6b7280', opacity: 0.5 }} />
                                    </div>
                                    <span className="text-[11px] truncate flex-1">{gc.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Detail */}
      {selectedReq ? (
        <RequirementDetailPanel
          requirement={selectedReq}
          features={features}
          allRequirements={requirements}
          relations={relations}
          onSelectFeature={handleSelect}
          onSelectRequirement={handleSelect}
          onSwitchToTree={onSwitchToTree}
        />
      ) : selectedFeature ? (
        <FeatureDetailPanel
          feature={selectedFeature}
          breadcrumb={breadcrumb}
          allFeatures={features}
          allRequirements={requirements}
          relations={relations}
          onSwitchToTree={onSwitchToTree}
          onSelectFeature={handleSelect}
          onSelectRequirement={handleSelect}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          요구사항 또는 기능을 선택하세요
        </div>
      )}
    </div>
  )
}
