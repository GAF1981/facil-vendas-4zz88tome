import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import { FileText, User, Calendar, TrendingUp } from 'lucide-react'
import { Employee } from '@/types/employee'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AcertoSummaryProps {
  employee: Employee | null
  date: Date
  monthlyAverage: number
  totalSales: number
  balanceToPay: number
  totalPaid: number
}

export function AcertoSummary({
  employee,
  date,
  monthlyAverage,
  totalSales,
  balanceToPay,
  totalPaid,
}: AcertoSummaryProps) {
  const debit = balanceToPay - totalPaid

  return (
    <Card className="border-muted bg-white dark:bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Resumo de Acertos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Vendedor
            </span>
            <div className="font-medium truncate">
              {employee?.nome_completo || 'N/A'}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Data do Acerto
            </span>
            <div className="font-medium">
              {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Média Mensal
            </span>
            <div className="font-medium">
              R$ {formatCurrency(monthlyAverage)}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Valor da Venda</span>
            <div className="font-medium">R$ {formatCurrency(totalSales)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex flex-col p-3 bg-muted/20 rounded-md">
            <span className="text-xs text-muted-foreground font-semibold uppercase">
              Saldo a Pagar
            </span>
            <span className="text-xl font-bold">
              R$ {formatCurrency(balanceToPay)}
            </span>
          </div>

          <div className="flex flex-col p-3 bg-green-50 text-green-900 rounded-md border border-green-100">
            <span className="text-xs font-semibold uppercase opacity-80">
              Valor Pago
            </span>
            <span className="text-xl font-bold">
              R$ {formatCurrency(totalPaid)}
            </span>
          </div>

          <div className="flex flex-col p-3 bg-red-50 text-red-900 rounded-md border border-red-100">
            <span className="text-xs font-semibold uppercase opacity-80">
              Débito
            </span>
            <span className="text-xl font-bold">
              R$ {formatCurrency(debit)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
