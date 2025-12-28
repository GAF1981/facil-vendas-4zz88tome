import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { Calculator, Tag, DollarSign, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AcertoSalesSummaryProps {
  items: AcertoItem[]
  client: ClientRow | null
}

export function AcertoSalesSummary({ items, client }: AcertoSalesSummaryProps) {
  const totalVendido = items.reduce((acc, item) => acc + item.valorVendido, 0)

  // Calculate Discount
  const descontoStr = client?.Desconto || '0'
  const descontoVal = parseCurrency(descontoStr.replace('%', ''))
  // Heuristic: if value > 1, assume it's a percentage number (e.g. 20 -> 20%), so divide by 100.
  // If value <= 1, assume it's a factor (e.g. 0.2 -> 20%).
  // This matches the logic in bancoDeDadosService
  const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal

  const valorDesconto = totalVendido * discountFactor
  const valorAcerto = totalVendido - valorDesconto

  return (
    <Card className="border-muted bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Resumos de Venda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-1 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> Valor Total Vendido
            </span>
            <span className="text-2xl font-bold">
              R$ {formatCurrency(totalVendido)}
            </span>
          </div>

          <div className="flex flex-col space-y-1 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" /> Valor do Desconto
              {descontoVal > 0 && (
                <span className="text-xs ml-1 bg-red-100 text-red-700 px-1.5 rounded-full">
                  {descontoStr.includes('%')
                    ? descontoStr
                    : `${(discountFactor * 100).toFixed(0)}%`}
                </span>
              )}
            </span>
            <span
              className={cn(
                'text-2xl font-bold',
                valorDesconto > 0 ? 'text-red-600' : '',
              )}
            >
              R$ {formatCurrency(valorDesconto)}
            </span>
          </div>

          <div className="flex flex-col space-y-1 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900 shadow-sm">
            <span className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Valor do Acerto
            </span>
            <span className="text-2xl font-bold text-green-700 dark:text-green-400">
              R$ {formatCurrency(valorAcerto)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
