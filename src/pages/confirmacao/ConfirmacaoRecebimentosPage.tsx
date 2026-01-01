import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  confirmationService,
  ConfirmationRow,
} from '@/services/confirmationService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

export default function ConfirmacaoRecebimentosPage() {
  const [data, setData] = useState<ConfirmationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await confirmationService.getConfirmationData()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de confirmação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleConfirm = async (orderId: number) => {
    setProcessing(orderId)
    try {
      // Only confirm Pix as requested
      await confirmationService.confirmPayment(orderId, { pix: true })
      toast({
        title: 'Confirmado',
        description: `Pagamento via Pix confirmado para o pedido #${orderId}.`,
        className: 'bg-green-50 border-green-200 text-green-900',
      })
      await loadData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar o pagamento.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Confirmação de Recebimentos (Pix)
        </h1>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Pix Pendentes de Confirmação</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Pedido</TableHead>
                    <TableHead className="w-[80px]">Cód. Cliente</TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Média Mensal</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Saldo a Pagar</TableHead>
                    <TableHead className="text-right font-semibold text-blue-600">
                      Valor Recebido Pix
                    </TableHead>
                    <TableHead className="">Pix (Descrição)</TableHead>
                    <TableHead className="text-right text-red-600 font-bold bg-red-50">
                      A Confirmar
                    </TableHead>
                    <TableHead className="text-center w-[100px]">
                      Confirmar
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum pagamento Pix pendente de confirmação.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow
                        key={row.orderId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono font-medium">
                          #{row.orderId}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.date
                            ? format(parseISO(row.date), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">
                          {row.employee}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {row.monthlyAverage
                            ? formatCurrency(row.monthlyAverage)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(row.totalSale)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(row.amountToPay)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-blue-600 bg-blue-50/50">
                          {formatCurrency(row.pixAmount)}
                        </TableCell>
                        <TableCell
                          className="text-xs text-muted-foreground max-w-[200px] truncate"
                          title={row.pixDescription}
                        >
                          {row.pixDescription || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-red-600 bg-red-50/30">
                          {formatCurrency(row.remainingAmount)}
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={false} // Always unchecked initially
                              onCheckedChange={() => handleConfirm(row.orderId)}
                              disabled={processing === row.orderId}
                              title="Confirmar Pix"
                              className="data-[state=checked]:bg-green-600 border-green-600 w-5 h-5"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
