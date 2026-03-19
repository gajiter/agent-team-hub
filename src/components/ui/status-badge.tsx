import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Status = 'done' | 'in-progress' | 'todo'
type Priority = 'high' | 'medium' | 'low'

const STATUS_MAP: Record<Status, { label: string; className: string }> = {
  done: { label: '완료', className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' },
  'in-progress': { label: '진행 중', className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100' },
  todo: { label: '대기', className: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100' },
}

const PRIORITY_MAP: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-50' },
  medium: { label: 'Medium', className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50' },
  low: { label: 'Low', className: 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-50' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.todo
  return <Badge variant="outline" className={cn('text-xs font-medium', className)}>{label}</Badge>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = PRIORITY_MAP[priority] ?? PRIORITY_MAP.low
  return <Badge variant="outline" className={cn('text-xs font-medium', className)}>{label}</Badge>
}
