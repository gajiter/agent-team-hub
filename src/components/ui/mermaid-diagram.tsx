'use client'

import { useEffect, useRef, useState, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch'

let mermaidInitialized = false
let mermaidModule: typeof import('mermaid') | null = null

async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = await import('mermaid')
  }
  if (!mermaidInitialized) {
    mermaidModule.default.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    })
    mermaidInitialized = true
  }
  return mermaidModule.default
}

function makeSvgResponsive(svgString: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return svgString

  const w = svg.getAttribute('width')
  const h = svg.getAttribute('height')

  if (!svg.getAttribute('viewBox') && w && h) {
    const wNum = parseFloat(w)
    const hNum = parseFloat(h)
    if (!isNaN(wNum) && !isNaN(hNum)) {
      svg.setAttribute('viewBox', `0 0 ${wNum} ${hNum}`)
    }
  }

  svg.setAttribute('width', '100%')
  svg.removeAttribute('height')
  svg.style.maxHeight = 'none'

  return svg.outerHTML
}

function ViewerToolbar({
  onExpand,
  scale,
}: {
  onExpand?: () => void
  scale: number
}) {
  const { zoomIn, zoomOut, resetTransform } = useControls()

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 rounded-t-lg">
      <div className="flex items-center gap-0.5">
        <button onClick={() => zoomOut()} title="축소" className="px-2 py-1 text-sm hover:bg-muted rounded transition-colors">-</button>
        <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={() => zoomIn()} title="확대" className="px-2 py-1 text-sm hover:bg-muted rounded transition-colors">+</button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => resetTransform()} title="맞춤" className="px-2 py-1 text-xs hover:bg-muted rounded transition-colors">Fit</button>
      </div>
      {onExpand && (
        <button onClick={onExpand} title="전체 화면" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
          </svg>
        </button>
      )}
    </div>
  )
}

function FullscreenOverlay({ svg, onClose }: { svg: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const responsiveSvg = makeSvgResponsive(svg)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit
        smooth={false}
        alignmentAnimation={{ disabled: true }}
        wheel={{ activationKeys: ['Control', 'Meta'] }}
        onTransformed={(_ref, state) => setScale(state.scale)}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80">
          <span className="text-xs font-mono text-muted-foreground">{Math.round(scale * 100)}%</span>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <TransformComponent
          wrapperStyle={{ width: '100%', flex: 1, cursor: 'grab' }}
          contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: responsiveSvg }} />
        </TransformComponent>
      </TransformWrapper>
    </div>,
    document.body
  )
}

function InlineViewer({ svg }: { svg: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [viewportHeight, setViewportHeight] = useState<number>(400)

  const responsiveSvg = makeSvgResponsive(svg)

  useEffect(() => {
    if (!contentRef.current) return
    const measure = () => {
      const svgEl = contentRef.current?.querySelector('svg')
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect()
        setViewportHeight(Math.max(200, Math.round(rect.height) + 32))
      }
    }
    measure()
    const timer = setTimeout(measure, 100)
    const observer = new ResizeObserver(measure)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => { observer.disconnect(); clearTimeout(timer) }
  }, [responsiveSvg])

  const openFullscreen = useCallback(() => setIsFullscreen(true), [])
  const closeFullscreen = useCallback(() => setIsFullscreen(false), [])

  return (
    <>
      <div ref={wrapperRef} className="my-4 rounded-lg border border-border bg-background not-prose group relative">
        <TransformWrapper
          initialScale={1}
          minScale={0.2}
          maxScale={5}
          centerOnInit
          smooth={false}
          alignmentAnimation={{ disabled: true }}
          wheel={{ activationKeys: ['Control', 'Meta'] }}
          onTransformed={(_ref, state) => setScale(state.scale)}
        >
          <ViewerToolbar onExpand={openFullscreen} scale={scale} />
          <TransformComponent
            wrapperStyle={{ width: '100%', height: viewportHeight, cursor: 'grab' }}
            contentStyle={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          >
            <div ref={contentRef} style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: responsiveSvg }} />
          </TransformComponent>
        </TransformWrapper>
      </div>
      {isFullscreen && <FullscreenOverlay svg={svg} onClose={closeFullscreen} />}
    </>
  )
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const uniqueId = useId().replace(/:/g, '-')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = await getMermaid()
        const isDark = document.documentElement.classList.contains('dark')
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        })
        const { svg: rendered } = await mermaid.render(`mermaid${uniqueId}`, chart.trim())
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid 렌더링 실패')
          setSvg(null)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart, uniqueId])

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 not-prose">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
          Mermaid 다이어그램 오류
        </div>
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">원본 코드 보기</summary>
          <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded">{chart}</pre>
        </details>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center rounded-lg border border-border bg-muted/20 p-8 not-prose">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          다이어그램 렌더링 중...
        </div>
      </div>
    )
  }

  return <InlineViewer svg={svg} />
}
