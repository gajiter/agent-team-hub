import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PrdSectionProps {
  icon: string
  title: string
  children: React.ReactNode
}

export default function PrdSection({ icon, title, children }: PrdSectionProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
      <div className="text-sm text-foreground leading-relaxed px-4 py-3 bg-muted/40 rounded-lg border-l-2 border-primary/30 whitespace-pre-wrap">
        {value || <span className="text-muted-foreground/60 italic">내용 없음</span>}
      </div>
    </div>
  )
}
