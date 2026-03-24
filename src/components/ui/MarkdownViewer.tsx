'use client'

import { useState, useCallback, useMemo, type ReactNode, type ReactElement, type HTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from 'remark-cjk-friendly'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components, ExtraProps } from 'react-markdown'
import { MermaidDiagram } from './mermaid-diagram'

/** YAML frontmatter 블록을 제거 */
function stripFrontmatter(content: string): string {
  if (!content) return ''
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
}

/** 코드 블록 복사 버튼 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200"
      title="복사"
    >
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  )
}

/** ReactNode에서 텍스트 추출 */
function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!node) return ''
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    const el = node as ReactElement<{ children?: ReactNode }>
    return extractText(el.props.children)
  }
  return ''
}

/** code 엘리먼트에서 language 클래스 추출 */
function extractLangFromChild(children: ReactNode): string | null {
  if (!children) return null
  const child = Array.isArray(children) ? children[0] : children
  if (child && typeof child === 'object' && 'props' in child) {
    const el = child as ReactElement<{ className?: string }>
    const match = /language-(\w+)/.exec(el.props.className || '')
    return match ? match[1] : null
  }
  return null
}

/** 텍스트를 slug로 변환 (heading ID 용) */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/** heading 컴포넌트 생성 (ID 자동 부여) */
function createHeading(level: number) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return function HeadingComponent({ children, node, ...props }: HTMLAttributes<HTMLHeadingElement> & ExtraProps) {
    const text = extractText(children)
    const id = slugify(text)
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    )
  }
}

/** 내부 문서 링크인지 판별 */
function isInternalDocLink(href: string): boolean {
  if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:')) {
    return false
  }
  if (href.endsWith('.md') || href.includes('.md#')) {
    return true
  }
  if (href.startsWith('docs/') || href.startsWith('data/')) {
    return true
  }
  return false
}

/** data/ JSON 파일 경로를 Hub 페이지 경로로 매핑 */
const DATA_ROUTE_MAP: Record<string, string> = {
  'data/prd.json': '/prd',
  'data/features.json': '/features',
  'data/roles.json': '/roles',
  'data/userflow.json': '/userflow',
}

/** markdownComponents 생성 (onLinkClick 주입) */
function createMarkdownComponents(onLinkClick?: (href: string) => void): Components {
  return {
    h1: createHeading(1),
    h2: createHeading(2),
    h3: createHeading(3),
    h4: createHeading(4),
    h5: createHeading(5),
    h6: createHeading(6),

    pre({ children }) {
      const lang = extractLangFromChild(children)
      const codeString = extractText(children).replace(/\n$/, '')

      if (lang === 'mermaid') {
        return <MermaidDiagram chart={codeString} />
      }

      return (
        <div className="group relative rounded-lg overflow-hidden border border-border my-4 not-prose">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              {lang || 'code'}
            </span>
            <CopyButton text={codeString} />
          </div>
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              language={lang || 'text'}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '0.875rem',
                lineHeight: '1.625',
              }}
              showLineNumbers={codeString.split('\n').length > 3}
              lineNumberStyle={{ color: '#636d83', fontSize: '0.75rem', minWidth: '2.5em' }}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        </div>
      )
    },

    code({ children, ...props }) {
      return (
        <code
          className="text-[0.85em] font-mono px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          {...props}
        >
          {children}
        </code>
      )
    },

    table({ children }) {
      return (
        <div className="overflow-x-auto my-4 not-prose">
          <table className="min-w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
            {children}
          </table>
        </div>
      )
    },
    thead({ children }) {
      return (
        <thead className="bg-muted/60 dark:bg-muted/30">
          {children}
        </thead>
      )
    },
    th({ children }) {
      return (
        <th className="px-4 py-2 text-left text-xs font-semibold text-foreground border-b border-border">
          {children}
        </th>
      )
    },
    td({ children }) {
      return (
        <td className="px-4 py-2 text-sm text-foreground/80 border-b border-border">
          {children}
        </td>
      )
    },

    hr() {
      return <hr className="my-6 border-border" />
    },

    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-primary/40 pl-4 my-4 text-muted-foreground italic">
          {children}
        </blockquote>
      )
    },

    a({ href, children, ...props }) {
      if (href && isInternalDocLink(href) && onLinkClick) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault()
              onLinkClick(href)
            }}
            className="text-primary no-underline hover:underline cursor-pointer"
            {...props}
          >
            {children}
          </a>
        )
      }

      const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
      return (
        <a
          href={href}
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...props}
        >
          {children}
        </a>
      )
    },
  }
}

export default function MarkdownViewer({ content, className = '', onLinkClick }: {
  content: string
  className?: string
  onLinkClick?: (href: string) => void
}) {
  const stripped = stripFrontmatter(content)
  const components = useMemo(() => createMarkdownComponents(onLinkClick), [onLinkClick])

  return (
    <div
      className={[
        'prose prose-sm max-w-none',
        'prose-headings:text-foreground',
        'prose-p:text-foreground/80',
        'prose-strong:text-foreground',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-li:text-foreground/80',
        'prose-li:marker:text-muted-foreground',
        'prose-img:rounded-lg',
        className,
      ].join(' ')}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        components={components}
      >
        {stripped}
      </ReactMarkdown>
    </div>
  )
}

/** 상대 경로를 현재 문서 기준으로 resolve */
export function resolveDocLink(href: string, currentDocPath: string): string {
  if (href.startsWith('docs/') || href.startsWith('data/')) {
    return href
  }

  const currentDir = currentDocPath.substring(0, currentDocPath.lastIndexOf('/'))
  const parts = `${currentDir}/${href}`.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') resolved.pop()
    else if (part !== '.') resolved.push(part)
  }
  return resolved.join('/')
}

/** data/ JSON 경로를 Hub 라우트로 변환 */
export function getDataRoute(path: string): string | null {
  return DATA_ROUTE_MAP[path] ?? null
}
