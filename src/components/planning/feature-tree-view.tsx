'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch'
import type { Feature, Requirement, Relation } from '@/types/features'
import FeatureDetailPanel from './feature-detail-panel'
import RequirementDetailPanel from './requirement-detail-panel'

interface FeatureTreeViewProps {
  features: Feature[]
  requirements: Requirement[]
  relations: Relation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
}

const RELATION_COLORS: Record<string, string> = {
  depends: '#ef4444',
  related: '#3b82f6',
  extends: '#22c55e',
}

// Layout constants
const REQ_W = 290
const REQ_H = 80
const FEAT_W = 270
const FEAT_H = 46
const SUB_W = 250
const SUB_H = 42
const SUBSUB_W = 230
const SUBSUB_H = 38

const COL_GAP = 140
const FEAT_ROW_GAP = 12
const SUB_ROW_GAP = 8
const SUBSUB_ROW_GAP = 6
const BLOCK_GAP = 60
const PAD = 50

const COL1 = PAD
const COL2 = COL1 + REQ_W + COL_GAP
const COL3 = COL2 + FEAT_W + COL_GAP
const COL4 = COL3 + SUB_W + COL_GAP

interface Rect { x: number; y: number; w: number; h: number }
interface SubSubNode { feature: Feature; rect: Rect }
interface SubNode { feature: Feature; rect: Rect; subs: SubSubNode[] }
interface FeatNode { feature: Feature; rect: Rect; subs: SubNode[]; rowH: number }
interface Block { requirement: Requirement; reqRect: Rect; feats: FeatNode[] }

function CanvasToolbar({ scale, showRelations, onToggleRelations }: {
  scale: number
  showRelations: boolean
  onToggleRelations: () => void
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5">
      <button onClick={() => zoomOut()} className="px-2 py-1 text-sm hover:bg-accent rounded transition-colors" title="축소">−</button>
      <button onClick={() => resetTransform()} className="px-2 py-1 text-xs text-muted-foreground hover:bg-accent rounded transition-colors min-w-[3rem] text-center" title="초기화">
        {Math.round(scale * 100)}%
      </button>
      <button onClick={() => zoomIn()} className="px-2 py-1 text-sm hover:bg-accent rounded transition-colors" title="확대">+</button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button
        onClick={onToggleRelations}
        className={`px-2 py-1 rounded transition-colors ${showRelations ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
        title={showRelations ? '관계선 숨기기' : '관계선 표시'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>
    </div>
  )
}

export default function FeatureTreeView({
  features,
  requirements,
  relations,
  selectedId,
  onSelect,
}: FeatureTreeViewProps) {
  const [showRelations, setShowRelations] = useState(true)
  const [scale, setScale] = useState(0.85)
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
  const DRAG_THRESHOLD = 5

  const handleCardClick = useCallback((id: string, e: React.MouseEvent) => {
    if (mouseDownPos.current) {
      const dx = e.clientX - mouseDownPos.current.x
      const dy = e.clientY - mouseDownPos.current.y
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) return
    }
    onSelect(id)
  }, [onSelect])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const fMap = useMemo(() => new Map(features.map(f => [f.id, f])), [features])

  const getChildren = useCallback((featureId: string) =>
    features.filter(f => f.parentId === featureId),
    [features]
  )

  const relatedIds = useMemo(() => {
    if (!selectedId) return new Set<string>()
    const ids = new Set<string>()
    for (const rel of relations) {
      if (rel.from === selectedId) ids.add(rel.to)
      if (rel.to === selectedId) ids.add(rel.from)
    }
    return ids
  }, [selectedId, relations])

  const activeRelationKeys = useMemo(() => {
    if (!selectedId) return new Set<string>()
    const keys = new Set<string>()
    for (const rel of relations) {
      if (rel.from === selectedId || rel.to === selectedId) {
        keys.add(`rel-${rel.from}-${rel.to}`)
      }
    }
    return keys
  }, [selectedId, relations])

  const { blocks, canvasW, canvasH, lines, relationLines } = useMemo(() => {
    const sorted = [...requirements].sort((a, b) => a.order - b.order)
    const result: Block[] = []
    let cursor = PAD
    const nodeRects = new Map<string, Rect>()

    for (const req of sorted) {
      const rootFeats = features.filter(f => f.parentId === null && f.requirementId === req.id)
      if (rootFeats.length === 0) continue

      const blockTopY = cursor
      const rows: { feat: Feature; childFeats: { child: Feature; grandChildren: Feature[] }[]; rowH: number }[] = []

      for (const feat of rootFeats) {
        const childFeats = getChildren(feat.id).map(child => ({
          child,
          grandChildren: getChildren(child.id),
        }))
        let subsH = 0
        if (childFeats.length > 0) {
          for (const { grandChildren } of childFeats) {
            const gcH = grandChildren.length > 0
              ? grandChildren.length * SUBSUB_H + (grandChildren.length - 1) * SUBSUB_ROW_GAP
              : 0
            subsH += Math.max(SUB_H, gcH)
          }
          subsH += (childFeats.length - 1) * SUB_ROW_GAP
        }
        rows.push({ feat, childFeats, rowH: Math.max(FEAT_H, subsH) })
      }

      const totalBlockH = rows.reduce((sum, r) => sum + r.rowH, 0) + (rows.length - 1) * FEAT_ROW_GAP
      const feats: FeatNode[] = []
      let rowY = blockTopY

      for (const { feat, childFeats, rowH } of rows) {
        const featRect: Rect = { x: COL2, y: rowY + (rowH - FEAT_H) / 2, w: FEAT_W, h: FEAT_H }
        nodeRects.set(feat.id, featRect)

        let totalSubsH = 0
        const subHeights: number[] = []
        for (const { grandChildren } of childFeats) {
          const gcH = grandChildren.length > 0 ? grandChildren.length * SUBSUB_H + (grandChildren.length - 1) * SUBSUB_ROW_GAP : 0
          const sh = Math.max(SUB_H, gcH)
          subHeights.push(sh)
          totalSubsH += sh
        }
        if (childFeats.length > 1) totalSubsH += (childFeats.length - 1) * SUB_ROW_GAP

        const subsTopY = rowY + (rowH - totalSubsH) / 2
        let subCursorY = subsTopY
        const subs: SubNode[] = childFeats.map(({ child, grandChildren }, si) => {
          const sh = subHeights[si]
          const subRect: Rect = { x: COL3, y: subCursorY + (sh - SUB_H) / 2, w: SUB_W, h: SUB_H }
          nodeRects.set(child.id, subRect)

          const gcTotalH = grandChildren.length > 0 ? grandChildren.length * SUBSUB_H + (grandChildren.length - 1) * SUBSUB_ROW_GAP : 0
          const gcTopY = subCursorY + (sh - gcTotalH) / 2
          const subSubs: SubSubNode[] = grandChildren.map((gc, gi) => {
            const gcRect: Rect = { x: COL4, y: gcTopY + gi * (SUBSUB_H + SUBSUB_ROW_GAP), w: SUBSUB_W, h: SUBSUB_H }
            nodeRects.set(gc.id, gcRect)
            return { feature: gc, rect: gcRect }
          })

          subCursorY += sh + SUB_ROW_GAP
          return { feature: child, rect: subRect, subs: subSubs }
        })

        feats.push({ feature: feat, rect: featRect, subs, rowH })
        rowY += rowH + FEAT_ROW_GAP
      }

      const reqRect: Rect = { x: COL1, y: blockTopY + (totalBlockH - REQ_H) / 2, w: REQ_W, h: REQ_H }
      nodeRects.set(req.id, reqRect)
      result.push({ requirement: req, reqRect, feats })
      cursor = blockTopY + totalBlockH + BLOCK_GAP
    }

    // Generate SVG curves
    const allLines: { d: string; key: string }[] = []
    for (const block of result) {
      const cRight = block.reqRect.x + block.reqRect.w
      const cTop = block.reqRect.y
      const cH = block.reqRect.h
      const featCount = block.feats.length

      block.feats.forEach((fn, fi) => {
        const exitY = featCount === 1 ? cTop + cH / 2 : cTop + (cH * 0.15) + ((cH * 0.7) * fi / (featCount - 1))
        const fLeft = fn.rect.x
        const fCY = fn.rect.y + fn.rect.h / 2
        const cpx = (cRight + fLeft) / 2
        allLines.push({ d: `M ${cRight} ${exitY} C ${cpx} ${exitY}, ${cpx} ${fCY}, ${fLeft} ${fCY}`, key: `r-${block.requirement.id}-${fn.feature.id}` })

        const fRight = fn.rect.x + fn.rect.w
        const subCount = fn.subs.length
        fn.subs.forEach((sn, si) => {
          const fExitY = subCount === 1 ? fCY : fCY + ((si - (subCount - 1) / 2) * Math.min(12, fn.rect.h * 0.6 / Math.max(subCount - 1, 1)))
          const sLeft = sn.rect.x
          const sCY = sn.rect.y + sn.rect.h / 2
          const cpx2 = (fRight + sLeft) / 2
          allLines.push({ d: `M ${fRight} ${fExitY} C ${cpx2} ${fExitY}, ${cpx2} ${sCY}, ${sLeft} ${sCY}`, key: `f-${fn.feature.id}-${sn.feature.id}` })

          const sRight = sn.rect.x + sn.rect.w
          const subSubCount = sn.subs.length
          sn.subs.forEach((ssn, ssi) => {
            const sExitY = subSubCount === 1 ? sCY : sCY + ((ssi - (subSubCount - 1) / 2) * Math.min(10, sn.rect.h * 0.5 / Math.max(subSubCount - 1, 1)))
            const ssLeft = ssn.rect.x
            const ssCY = ssn.rect.y + ssn.rect.h / 2
            const cpx3 = (sRight + ssLeft) / 2
            allLines.push({ d: `M ${sRight} ${sExitY} C ${cpx3} ${sExitY}, ${cpx3} ${ssCY}, ${ssLeft} ${ssCY}`, key: `s-${sn.feature.id}-${ssn.feature.id}` })
          })
        })
      })
    }

    // Relation lines
    const relLines: { d: string; key: string; color: string }[] = []
    for (const rel of relations) {
      const fromRect = nodeRects.get(rel.from)
      const toRect = nodeRects.get(rel.to)
      if (!fromRect || !toRect) continue

      const fromCX = fromRect.x + fromRect.w / 2
      const toCX = toRect.x + toRect.w / 2
      const fromBottom = fromRect.y + fromRect.h
      const toTop = toRect.y
      let fromX: number, fromY: number, toX: number, toY: number

      if (fromBottom < toTop) {
        fromX = fromCX; fromY = fromBottom; toX = toCX; toY = toTop
      } else {
        fromX = fromCX; fromY = fromRect.y; toX = toCX; toY = toRect.y + toRect.h
      }

      const dx = toX - fromX
      const dy = toY - fromY
      const isVertical = Math.abs(dy) > Math.abs(dx)
      let d: string
      if (isVertical) {
        const offset = dx > 0 ? 30 : -30
        d = `M ${fromX} ${fromY} C ${fromX + offset} ${fromY + dy * 0.3}, ${toX - offset} ${toY - dy * 0.3}, ${toX} ${toY}`
      } else {
        const offset = dy > 0 ? 30 : -30
        d = `M ${fromX} ${fromY} C ${fromX + dx * 0.3} ${fromY + offset}, ${toX - dx * 0.3} ${toY - offset}, ${toX} ${toY}`
      }

      relLines.push({ d, key: `rel-${rel.from}-${rel.to}`, color: RELATION_COLORS[rel.type] ?? RELATION_COLORS.related })
    }

    const hasDepth3 = result.some(b => b.feats.some(fn => fn.subs.some(sn => sn.subs.length > 0)))

    return {
      blocks: result,
      canvasW: hasDepth3 ? COL4 + SUBSUB_W + PAD : COL3 + SUB_W + PAD,
      canvasH: cursor + PAD,
      lines: allLines,
      relationLines: relLines,
    }
  }, [features, requirements, relations, getChildren])

  const selReq = selectedId?.startsWith('REQ-') ? requirements.find(r => r.id === selectedId) ?? null : null
  const selFeat = selectedId && !selectedId.startsWith('REQ-') ? fMap.get(selectedId) ?? null : null
  const selReqForFeat = selFeat ? requirements.find(r => r.id === selFeat.requirementId) : null
  const breadcrumb = selFeat && selReqForFeat
    ? selFeat.parentId
      ? [selReqForFeat.name, fMap.get(selFeat.parentId)?.name ?? '', selFeat.name].filter(Boolean)
      : [selReqForFeat.name, selFeat.name]
    : []

  const isRelated = (nodeId: string) => relatedIds.has(nodeId)

  const cardClass = (id: string) => {
    if (selectedId === id) return 'bg-primary/10 border-2 border-primary/50 shadow-md'
    if (isRelated(id)) return 'bg-card border-2 border-primary/30 shadow-md ring-2 ring-primary/20'
    return 'bg-card border border-border hover:border-primary/30 hover:shadow-md'
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 bg-muted/30 overflow-hidden relative" onMouseDown={handleMouseDown}>
        <TransformWrapper
          initialScale={0.85}
          minScale={0.2}
          maxScale={2}
          centerOnInit={false}
          limitToBounds={false}
          smooth={false}
          wheel={{ step: 0.08 }}
          onTransformed={(_ref, state) => setScale(state.scale)}
        >
          <CanvasToolbar scale={scale} showRelations={showRelations} onToggleRelations={() => setShowRelations(v => !v)} />
          {showRelations && relationLines.length > 0 && (
            <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="text-muted-foreground font-medium mb-1">관계 범례</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: RELATION_COLORS.depends }} />
                <span>의존</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0 border-t-2 border-dashed" style={{ borderColor: RELATION_COLORS.related }} />
                <span>관련</span>
              </div>
            </div>
          )}
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', cursor: 'grab' }}
            contentStyle={{ width: canvasW, height: canvasH }}
          >
            <div style={{ width: canvasW, height: canvasH, position: 'relative' }}>
              <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} width={canvasW} height={canvasH}>
                {lines.map(({ d, key }) => (
                  <path key={key} d={d} fill="none" stroke="var(--color-border)" strokeWidth={1.5} opacity={0.45} />
                ))}
                {showRelations && relationLines
                  .filter(({ key }) => !activeRelationKeys.has(key))
                  .map(({ d, key, color }) => (
                    <path key={key} d={d} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="6 4" opacity={selectedId ? 0.15 : 0.4} style={{ transition: 'opacity 0.2s' }} />
                  ))}
                {showRelations && relationLines
                  .filter(({ key }) => activeRelationKeys.has(key))
                  .map(({ d, key, color }) => (
                    <path key={key} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="8 4" opacity={0.9} style={{ transition: 'opacity 0.2s' }} />
                  ))}
              </svg>
              <div style={{ position: 'relative', zIndex: 1 }}>
                {blocks.map(block => (
                  <div key={block.requirement.id}>
                    <div
                      className={`absolute rounded-xl shadow-sm p-4 select-none cursor-pointer transition-all ${cardClass(block.requirement.id)}`}
                      style={{ left: block.reqRect.x, top: block.reqRect.y, width: block.reqRect.w, height: block.reqRect.h }}
                      onClick={(e) => handleCardClick(block.requirement.id, e)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-3 rounded-full bg-primary/80" />
                          <div className="w-1 h-3 rounded-full bg-primary/50" />
                          <div className="w-1 h-3 rounded-full bg-primary/30" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{block.requirement.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{block.requirement.id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{block.feats.length}개 기능 포함</p>
                    </div>
                    {block.feats.map(fn => (
                      <div key={fn.feature.id}>
                        <div
                          className={`absolute rounded-lg shadow-sm px-3.5 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all select-none ${cardClass(fn.feature.id)}`}
                          style={{ left: fn.rect.x, top: fn.rect.y, width: fn.rect.w, height: fn.rect.h }}
                          onClick={(e) => handleCardClick(fn.feature.id, e)}
                        >
                          <div className="flex gap-0.5 flex-shrink-0">
                            <div className="w-1 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[fn.feature.priority] || '#6b7280' }} />
                            <div className="w-1 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[fn.feature.priority] || '#6b7280', opacity: 0.4 }} />
                          </div>
                          <span className="text-sm text-foreground truncate flex-1 font-medium">{fn.feature.name}</span>
                          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{fn.feature.id.replace('F-0', '')}</span>
                          {fn.subs.length > 0 && (
                            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 flex-shrink-0">+{fn.subs.length}</span>
                          )}
                        </div>
                        {fn.subs.map(sn => (
                          <div key={`${fn.feature.id}-${sn.feature.id}`}>
                            <div
                              className={`absolute rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-all select-none ${cardClass(sn.feature.id)}`}
                              style={{ left: sn.rect.x, top: sn.rect.y, width: sn.rect.w, height: sn.rect.h }}
                              onClick={(e) => handleCardClick(sn.feature.id, e)}
                            >
                              <div className="flex gap-0.5 flex-shrink-0">
                                <div className="w-0.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[sn.feature.priority] || '#6b7280' }} />
                                <div className="w-0.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[sn.feature.priority] || '#6b7280', opacity: 0.4 }} />
                              </div>
                              <span className="text-xs text-foreground truncate flex-1">{sn.feature.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{sn.feature.id.replace('F-0', '')}</span>
                              {sn.subs.length > 0 && (
                                <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 flex-shrink-0">+{sn.subs.length}</span>
                              )}
                            </div>
                            {sn.subs.map(ssn => (
                              <div
                                key={`${sn.feature.id}-${ssn.feature.id}`}
                                className={`absolute rounded-md px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all select-none ${cardClass(ssn.feature.id)}`}
                                style={{ left: ssn.rect.x, top: ssn.rect.y, width: ssn.rect.w, height: ssn.rect.h }}
                                onClick={(e) => handleCardClick(ssn.feature.id, e)}
                              >
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <div className="w-0.5 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[ssn.feature.priority] || '#6b7280' }} />
                                  <div className="w-0.5 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[ssn.feature.priority] || '#6b7280', opacity: 0.4 }} />
                                </div>
                                <span className="text-[11px] text-foreground truncate flex-1">{ssn.feature.name}</span>
                                <span className="text-[9px] text-muted-foreground font-mono flex-shrink-0">{ssn.feature.id.replace('F-0', '')}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {(selReq || selFeat) && (
        <div className="w-[420px] min-w-[420px] border-l border-border bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium">
              {selReq ? '요구사항 상세' : selFeat?.parentId ? '상세 기능' : '기능 상세'}
            </span>
            <button onClick={() => onSelect('')} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm">
              &#x2715;
            </button>
          </div>
          {selReq ? (
            <RequirementDetailPanel
              requirement={selReq}
              features={features}
              allRequirements={requirements}
              relations={relations}
              onSelectFeature={onSelect}
              onSelectRequirement={onSelect}
            />
          ) : selFeat ? (
            <FeatureDetailPanel
              feature={selFeat}
              breadcrumb={breadcrumb}
              allFeatures={features}
              allRequirements={requirements}
              relations={relations}
              onSelectFeature={onSelect}
              onSelectRequirement={onSelect}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
