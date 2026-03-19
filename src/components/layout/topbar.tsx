import { Separator } from '@/components/ui/separator'

interface TopbarProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export function Topbar({ title, subtitle, right }: TopbarProps) {
  return (
    <div className="flex items-center justify-between h-14 px-6 border-b">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">{subtitle}</span>
          </>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
