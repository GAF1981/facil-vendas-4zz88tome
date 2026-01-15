import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'
import { MovementDetail } from '@/types/inventory_general'
import { safeFormatDate } from '@/lib/formatters'
import { ReactNode } from 'react'

interface Props {
  title: string
  details: MovementDetail[]
  colorClass?: string
  children?: ReactNode
}

export function MovementDetailsPopover({
  title,
  details,
  colorClass = 'text-blue-600',
  children,
}: Props) {
  if (!details || details.length === 0) return <span>0</span>

  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-5 w-5 ${colorClass}`}
          >
            <Info className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="p-3 bg-muted border-b font-semibold text-sm">
            {title}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {details.map((detail, idx) => (
              <div
                key={idx}
                className="p-3 border-b last:border-0 flex justify-between items-start text-sm hover:bg-muted/30"
              >
                <div>
                  <p className="font-medium">{detail.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {safeFormatDate(detail.date)}
                  </p>
                </div>
                <span className="font-mono font-bold">{detail.quantity}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
