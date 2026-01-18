import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { History, PlusCircle, Calendar, DollarSign, User } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface RotaMotoqueiroItem {
  clientId: number
  clientName: string
  orderId: number
  vencimento: string | null
  valorParc: number
  pago: number
  debito: number
  dataCombinada: string | null
  status: string
}

interface RotaMotoqueiroCardItemProps {
  item: RotaMotoqueiroItem
  onConsult: () => void
  onRegister: () => void
}

export function RotaMotoqueiroCardItem({
  item,
  onConsult,
  onRegister,
}: RotaMotoqueiroCardItemProps) {
  const isOverdue = item.status === 'VENCIDO'
  const isPaid = item.status === 'PAGO'

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow hover:shadow-md border-l-4',
        isOverdue
          ? 'border-l-red-500'
          : isPaid
            ? 'border-l-green-500'
            : 'border-l-blue-500',
      )}
    >
      <CardHeader className="p-4 pb-2 bg-muted/10">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle
              className="text-base line-clamp-1"
              title={item.clientName}
            >
              {item.clientName}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono font-normal">
                {item.clientId}
              </Badge>
              <span>Pedido #{item.orderId}</span>
            </div>
          </div>
          <Badge
            variant={isOverdue ? 'destructive' : isPaid ? 'default' : 'outline'}
            className={cn(
              'text-[10px] px-2 py-0.5 uppercase',
              isPaid && 'bg-green-100 text-green-800 hover:bg-green-200',
              !isOverdue &&
                !isPaid &&
                'text-blue-600 border-blue-200 bg-blue-50',
            )}
          >
            {item.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Vencimento
            </span>
            <p className="font-medium">
              {item.vencimento
                ? safeFormatDate(item.vencimento, 'dd/MM/yy')
                : '-'}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Data Comb.
            </span>
            <p className="font-medium text-blue-600">
              {item.dataCombinada
                ? safeFormatDate(item.dataCombinada, 'dd/MM/yy')
                : '-'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Parcela</span>
            <p className="font-medium">{formatCurrency(item.valorParc)}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Pago</span>
            <p className="font-medium text-green-600">
              {formatCurrency(item.pago)}
            </p>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-xs text-muted-foreground">Débito</span>
            <p className="font-bold text-red-600">
              {formatCurrency(item.debito)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 bg-muted/20 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9"
          onClick={onConsult}
        >
          <History className="w-3.5 h-3.5 mr-2" />
          Histórico
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs h-9 bg-blue-600 hover:bg-blue-700"
          onClick={onRegister}
        >
          <PlusCircle className="w-3.5 h-3.5 mr-2" />
          Registrar
        </Button>
      </CardFooter>
    </Card>
  )
}
