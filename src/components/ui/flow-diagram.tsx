'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch'
import type { UserFlowData, FlowNode, FlowSection } from '@/types/userflow'

interface TreeNodeData {
  node: FlowNode
  children: TreeNodeData[]
}

function buildTrees(section: FlowSection): TreeNodeData[] {
  const childrenMap = new Map<string, string[]>()
  const hasIncoming = new Set<string>()
  const nodeMap = new Map<string, FlowNode>()

  section.nodes.forEach(n => nodeMap.set(n.id, n))
  section.edges.forEach(e => {
    if (!nodeMap.has(e.from) || !nodeMap.has(e.to)) return
    if (!childrenMap.has(e.from)) childrenMap.set(e.from, [])
    childrenMap.get(e.from)!.push(e.to)
    hasIncoming.add(e.to)
  })

  const roots = section.nodes.filter(n => !hasIncoming.has(n.id))
  const visited = new Set<string>()

  function buildTree(nodeId: string): TreeNodeData | null {
    if (visited.has(nodeId)) return null
    visited.add(nodeId)
    const node = nodeMap.get(nodeId)
    if (!node) return null
    const childIds = childrenMap.get(nodeId) || []
    const children = childIds.map(id => buildTree(id)).filter((t): t is TreeNodeData => t !== null)
    return { node, children }
  }

  return roots.map(r => buildTree(r.id)).filter((t): t is TreeNodeData => t !== null)
}

function getCrossSectionTargets(
  section: FlowSection,
  allSections: FlowSection[],
  allNodeIds: Set<string>,
): Map<string, string> {
  const nodeMap = new Set(section.nodes.map(n => n.id))
  const nodeToSection = new Map<string, string>()
  allSections.forEach(s => s.nodes.forEach(n => nodeToSection.set(n.id, s.name)))

  const result = new Map<string, string>()
  section.edges.forEach(e => {
    if (nodeMap.has(e.from) && !nodeMap.has(e.to) && allNodeIds.has(e.to)) {
      result.set(e.from, nodeToSection.get(e.to) || e.to)
    }
  })
  return result
}

const NODE_STYLES: Record<FlowNode['type'], string> = {
  start: 'bg-foreground text-background',
  section: 'bg-primary text-primary-foreground',
  page: 'bg-accent text-accent-foreground border border-primary/30',
  action: 'bg-card text-muted-foreground border border-border',
}

const DRAG_THRESHOLD = 5
const mouseDownPos: { current: { x: number; y: number } | null } = { current: null }

function FeatureIdBadge({ featureId }: { featureId: string }) {
  const router = useRouter()
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mouseDownPos.current) {
      const dx = e.clientX - mouseDownPos.current.x
      const dy = e.clientY - mouseDownPos.current.y
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) return
    }
    router.push(`/planning/features?id=${encodeURIComponent(featureId)}`)
  }

  return (
    <button
      onClick={handleClick}
      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono cursor-pointer hover:bg-primary/25 hover:text-primary transition-colors"
      title={`기능 명세 ${featureId} 보기`}
    >
      {featureId}
    </button>
  )
}

function NodeBox({ node, crossTarget }: { node: FlowNode; crossTarget?: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-sm ${NODE_STYLES[node.type]}`}>
        {node.label}
      </div>
      {node.featureIds && node.featureIds.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {node.featureIds.map(fid => (
            <FeatureIdBadge key={fid} featureId={fid} />
          ))}
        </div>
      )}
      {crossTarget && (
        <span className="text-[10px] text-muted-foreground italic">
          → {crossTarget}
        </span>
      )}
    </div>
  )
}

const LINE_COLOR = 'var(--border)'

function TreeNodeEl({ tree, crossTargets }: { tree: TreeNodeData; crossTargets: Map<string, string> }) {
  const crossTarget = crossTargets.get(tree.node.id)

  if (tree.children.length === 0) {
    return <NodeBox node={tree.node} crossTarget={crossTarget} />
  }

  return (
    <div className="flex items-center">
      <NodeBox node={tree.node} crossTarget={crossTarget} />
      <div className="w-6 min-w-6 flex items-center">
        <div className="w-full h-px" style={{ background: LINE_COLOR }} />
      </div>
      <div className="flex flex-col relative">
        {tree.children.map((child, i) => {
          const isFirst = i === 0
          const isLast = i === tree.children.length - 1
          const isOnly = tree.children.length === 1
          return (
            <div key={child.node.id} className="flex items-center relative py-1.5">
              {!isOnly && (
                <div
                  className="absolute left-0 w-px"
                  style={{
                    background: LINE_COLOR,
                    top: isFirst ? '50%' : 0,
                    bottom: isLast ? '50%' : 0,
                  }}
                />
              )}
              <div className="w-5 min-w-5 flex items-center">
                <div className="w-full h-px" style={{ background: LINE_COLOR }} />
              </div>
              <div
                className="w-0 h-0 mr-1.5 flex-shrink-0"
                style={{
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: `5px solid ${LINE_COLOR}`,
                }}
              />
              <TreeNodeEl tree={child} crossTargets={crossTargets} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionTree({
  section,
  allSections,
  allNodeIds,
}: {
  section: FlowSection
  allSections: FlowSection[]
  allNodeIds: Set<string>
}) {
  const trees = useMemo(() => buildTrees(section), [section])
  const crossTargets = useMemo(
    () => getCrossSectionTargets(section, allSections, allNodeIds),
    [section, allSections, allNodeIds],
  )

  if (trees.length === 0) return null

  return (
    <div className="flex items-start py-5 border-b border-dashed border-border last:border-0">
      <div className="w-28 min-w-28 pr-4 pt-2">
        <span className="text-sm font-semibold text-muted-foreground">{section.name}</span>
      </div>
      <div className="flex flex-col gap-4">
        {trees.map(tree => (
          <TreeNodeEl key={tree.node.id} tree={tree} crossTargets={crossTargets} />
        ))}
      </div>
    </div>
  )
}

function ZoomToolbar({ scale }: { scale: number }) {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5">
      <button onClick={() => zoomOut()} className="px-2 py-1 text-sm hover:bg-accent rounded transition-colors" title="축소">−</button>
      <button onClick={() => resetTransform()} className="px-2 py-1 text-xs text-muted-foreground hover:bg-accent rounded transition-colors min-w-[3rem] text-center" title="초기화">
        {Math.round(scale * 100)}%
      </button>
      <button onClick={() => zoomIn()} className="px-2 py-1 text-sm hover:bg-accent rounded transition-colors" title="확대">+</button>
    </div>
  )
}

export default function FlowDiagram({ data }: { data: UserFlowData }) {
  const [scale, setScale] = useState(0.85)

  const allNodeIds = useMemo(() => {
    const ids = new Set<string>()
    data.sections.forEach(s => s.nodes.forEach(n => ids.add(n.id)))
    return ids
  }, [data])

  return (
    <div
      className="flex-1 relative overflow-hidden bg-background"
      onMouseDown={(e) => { mouseDownPos.current = { x: e.clientX, y: e.clientY } }}
    >
      <TransformWrapper
        initialScale={0.85}
        minScale={0.3}
        maxScale={2}
        centerOnInit={false}
        limitToBounds={false}
        smooth={false}
        wheel={{ step: 0.08 }}
        onTransformed={(_ref, state) => setScale(state.scale)}
      >
        <ZoomToolbar scale={scale} />
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%', cursor: 'grab' }}>
          <div style={{ padding: '1.5rem', width: 'fit-content', minWidth: '100%' }}>
            {data.sections.map(section => (
              <SectionTree
                key={section.name}
                section={section}
                allSections={data.sections}
                allNodeIds={allNodeIds}
              />
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
