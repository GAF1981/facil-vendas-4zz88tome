import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number | null | undefined
  description?: string
  icon: LucideIcon
  className?: string
  iconClassName?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  iconClassName,
}: MetricCardProps) {
  // Robustly handle null/undefined values to prevent rendering errors
  const safeValue =
    value === null || value === undefined
      ? '0' // Default fallback
      : typeof value === 'object' // Guard against non-primitive types passing through
        ? 'N/A'
        : value

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-4 w-4', iconClassName)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{safeValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
