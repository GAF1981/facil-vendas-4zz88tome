import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavCardProps {
  title: string
  icon: LucideIcon
  to: string
  description: string
  className?: string
  iconColor?: string
}

export function MobileNavCard({
  title,
  icon: Icon,
  to,
  description,
  className,
  iconColor = 'text-primary',
}: MobileNavCardProps) {
  return (
    <Link to={to} className="block group">
      <Card
        className={cn(
          'transition-all duration-200 active:scale-[0.98] hover:border-primary/50 hover:shadow-md touch-manipulation',
          className,
        )}
      >
        <CardContent className="flex items-center p-6 gap-4">
          <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
            <Icon className={cn('w-8 h-8 transition-colors', iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
  )
}
