import { ExpenseDetail } from '@/services/caixaService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { ArrowUpCircle } from 'lucide-react'

interface ExpenseGalleryProps {
  items: ExpenseDetail[]
}

export function ExpenseGallery({ items }: ExpenseGalleryProps) {
  const total = items.reduce((acc, item) => acc + item.valor, 0)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4 px-6 border-b bg-red-50/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-700">
            <ArrowUpCircle className="h-5 w-5" />
            Galeria de Saídas
          </CardTitle>
          <span className="text-sm font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full">
            {items.length} registros
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhuma despesa registrada.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-muted/50 transition-colors flex justify-between items-center text-sm"
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span
                      className="font-medium truncate"
                      title={item.detalhamento}
                    >
                      {item.detalhamento}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 border">
                        {item.grupo}
                      </span>
                      <span>{safeFormatDate(item.data, 'dd/MM/yy')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 ml-2">
                    <span className="font-semibold text-red-700 whitespace-nowrap">
                      R$ {formatCurrency(item.valor)}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground truncate max-w-[80px]"
                      title={item.funcionarioNome}
                    >
                      {item.funcionarioNome || 'N/D'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-4 bg-muted/20 border-t mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-muted-foreground">
            Total Saídas
          </span>
          <span className="text-lg font-bold text-red-700">
            R$ {formatCurrency(total)}
          </span>
        </div>
      </div>
    </Card>
  )
}
