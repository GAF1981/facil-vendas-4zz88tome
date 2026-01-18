import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquareText, PlusCircle, Bike } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cobrancaService } from '@/services/cobrancaService'
import { ClientDebt } from '@/types/cobranca'
import { useToast } from '@/hooks/use-toast'
import { CollectionActionsSheet } from '@/components/cobranca/CollectionActionsSheet'

export function RotaMotoqueiroCard() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const { toast } = useToast()

  const [selectedOrderForActions, setSelectedOrderForActions] = useState<{
    orderId: string
    clientId: number
    clientName: string
  } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Re-using generic debt fetch but we will filter in memory as per existing service structure
      // Ideally a specialized lighter query should be used, but consistent with requested stack constraints
      const allDebts = await cobrancaService.getDebts()

      const motoqueiroItems: any[] = []

      allDebts.forEach((client: ClientDebt) => {
        client.orders.forEach((order) => {
          order.installments.forEach((inst) => {
            if (inst.formaCobranca === 'MOTOQUEIRO') {
              motoqueiroItems.push({
                clientId: client.clientId,
                clientName: client.clientName,
                orderId: order.orderId,
                vencimento: inst.vencimento,
                valorParc: inst.valorRegistrado,
                pago: inst.valorPago,
                debito: Math.max(0, inst.valorRegistrado - inst.valorPago),
                dataCombinada: inst.dataCombinada,
                status: inst.status,
              })
            }
          })
        })
      })

      setItems(motoqueiroItems)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a rota do motoqueiro.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Card className="col-span-full xl:col-span-2 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bike className="h-5 w-5 text-blue-600" />
            Rota Motoqueiro
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[60px]">Cód</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-[70px]">Pedido</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right font-bold text-red-600">
                  Débito
                </TableHead>
                <TableHead>Data Comb.</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum item na rota do motoqueiro.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {item.clientId}
                    </TableCell>
                    <TableCell className="font-medium text-xs truncate max-w-[150px]">
                      {item.clientName}
                    </TableCell>
                    <TableCell className="text-xs">{item.orderId}</TableCell>
                    <TableCell className="text-xs">
                      {safeFormatDate(item.vencimento, 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(item.valorParc)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-green-600">
                      {formatCurrency(item.pago)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-red-600">
                      {formatCurrency(item.debito)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.dataCombinada ? (
                        <Badge variant="outline" className="text-[10px]">
                          {safeFormatDate(item.dataCombinada, 'dd/MM')}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-blue-600"
                          onClick={() =>
                            setSelectedOrderForActions({
                              orderId: item.orderId.toString(),
                              clientId: item.clientId,
                              clientName: item.clientName,
                            })
                          }
                        >
                          <PlusCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-500"
                          onClick={() =>
                            setSelectedOrderForActions({
                              orderId: item.orderId.toString(),
                              clientId: item.clientId,
                              clientName: item.clientName,
                            })
                          }
                        >
                          <MessageSquareText className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {selectedOrderForActions && (
        <CollectionActionsSheet
          isOpen={!!selectedOrderForActions}
          onClose={() => setSelectedOrderForActions(null)}
          orderId={selectedOrderForActions.orderId}
          clientId={selectedOrderForActions.clientId}
          clientName={selectedOrderForActions.clientName}
          onActionAdded={() => {
            fetchData() // Refresh list to update action counts if we showed them, or general state
          }}
        />
      )}
    </Card>
  )
}
