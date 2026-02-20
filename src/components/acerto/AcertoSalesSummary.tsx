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

  const descontoStr = client?.Desconto || '0'
  let valorDesconto = 0

  if (descontoStr.includes('%')) {
    const pct = parseCurrency(descontoStr.replace('%', ''))
    valorDesconto = totalVendido * (pct / 100)
  } else {
    valorDesconto = parseCurrency(descontoStr)
  }

  const valorAcerto = totalVendido - valorDesconto

  return (
    <Card className="border-muted bg-muted/10">
      <CardHeader className="py-2 px-4 min-h-[40px]">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Resumos de Venda
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-1 gap-2">
          <div className="flex justify-between items-center p-2 bg-white dark:bg-card rounded border shadow-sm h-8">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Tag className="h-3 w-3" /> Valor Vendido
            </span>
            <span className="text-sm font-bold">
              R$ {formatCurrency(totalVendido)}
            </span>
          </div>

          <div className="flex justify-between items-center p-2 bg-white dark:bg-card rounded border shadow-sm h-8">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Percent className="h-3 w-3" /> Desconto
              {descontoStr.includes('%') && (
                <span className="text-[9px] ml-1 bg-red-100 text-red-700 px-1 rounded-full">
                  {descontoStr}
                </span>
              )}
            </span>
            <span
              className={cn(
                'text-sm font-bold',
                valorDesconto > 0 ? 'text-red-600' : '',
              )}
            >
              R$ {formatCurrency(valorDesconto)}
            </span>
          </div>

          <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900 shadow-sm h-9">
            <span className="text-[10px] text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Valor Acerto
            </span>
            <span className="text-lg font-bold text-green-700 dark:text-green-400">
              R$ {formatCurrency(valorAcerto)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
