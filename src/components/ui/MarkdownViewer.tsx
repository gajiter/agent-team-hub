'use client'

import { cn } from '@/lib/utils'

interface MarkdownViewerProps {
  content: string
  className?: string
}

/** Simple markdown viewer that renders content as preformatted text with prose styling */
export default function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words', className)}>
      {content}
    </div>
  )
}
