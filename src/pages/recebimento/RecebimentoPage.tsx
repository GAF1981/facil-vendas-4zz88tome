import { useEffect, useState, useMemo } from 'react'
import { cobrancaService } from '@/services/cobrancaService'
import { recebimentoService } from '@/services/recebimentoService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, Search, Printer, CheckSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderDebt } from '@/types/cobranca'
import { RecebimentoPaymentDialog } from '@/components/recebimento/RecebimentoPaymentDialog'
import { PaymentEntry } from '@/types/payment'
import { useAuth } from '@/hooks/use-auth'
import { ClientRow } from '@/types/client'
import { Checkbox } from '@/components/ui/checkbox'

interface FlattenedOrder extends OrderDebt {
  clientName: string
  clientId: number
}

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<FlattenedOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Single selection state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await cobrancaService.getDebts()
      const flatOrders: FlattenedOrder[] = result
        .flatMap((client) =>
          client.orders
            .filter((o) => o.remainingValue > 0.05)
            .map((order) => ({
              ...order,
              clientName: client.clientName,
              clientId: client.clientId,
            })),
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setOrders(flatOrders)
      // Reset selection on reload
      setSelectedOrderId(null)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os débitos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders
    const lower = searchTerm.toLowerCase()
    return orders.filter(
      (o) =>
        o.orderId.toString().includes(lower) ||
        o.clientName.toLowerCase().includes(lower) ||
        (o.employeeName && o.employeeName.toLowerCase().includes(lower)),
    )
  }, [orders, searchTerm])

  const handleSelectOrder = (orderId: number) => {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null) // Deselect
    } else {
      setSelectedOrderId(orderId) // Select new (auto deselects others)
    }
  }

  const selectedOrderData = useMemo(() => {
    return orders.find((o) => o.orderId === selectedOrderId) || null
  }, [orders, selectedOrderId])

  const handleOpenPayment = () => {
    if (selectedOrderData) {
      setDialogOpen(true)
    }
  }

  const handleGeneratePdf = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row selection logic interference
    setGeneratingPdf(orderId)
    try {
      const blob = await cobrancaService.generateOrderReceipt(orderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo_pedido_${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Sucesso',
        description: 'PDF gerado com sucesso.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(null)
    }
  }

  const handleConfirmPayment = async (payments: PaymentEntry[]) => {
    if (!selectedOrderData || !user) return

    try {
      const clientMock = { CODIGO: selectedOrderData.clientId } as ClientRow

      const employeeMock = {
        id: 1, // Fallback ID
        nome_completo: user.email || 'Sistema',
        email: user.email || '',
        situacao: 'ATIVO',
        setor: [],
      } as any

      await recebimentoService.saveRecebimento(
        clientMock,
        employeeMock,
        payments,
        selectedOrderData.orderId,
      )

      toast({
        title: 'Sucesso',
        description: 'Recebimento registrado com sucesso.',
        className: 'bg-green-600 text-white',
      })

      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar recebimento.',
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Recebimentos
          </h1>
          <p className="text-muted-foreground">
            Registre pagamentos e gerencie débitos históricos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <Loader2
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button
            onClick={handleOpenPayment}
            disabled={!selectedOrderId}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Processar Pagamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Resumo Acerto (Histórico)</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido, cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Venda</TableHead>
                <TableHead className="text-right">Saldo a Pagar</TableHead>
                <TableHead className="w-[80px] text-center">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum débito encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.orderId}
                    className={
                      selectedOrderId === order.orderId ? 'bg-muted/50' : ''
                    }
                    onClick={() => handleSelectOrder(order.orderId)}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedOrderId === order.orderId}
                        onCheckedChange={() => handleSelectOrder(order.orderId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-mono">
                      #{order.orderId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.clientName}</span>
                        <span className="text-xs text-muted-foreground">
                          ID: {order.clientId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {safeFormatDate(order.date, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.employeeName || 'N/D'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(order.totalValue)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(order.remainingValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleGeneratePdf(order.orderId, e)}
                        disabled={generatingPdf === order.orderId}
                      >
                        {generatingPdf === order.orderId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecebimentoPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrderData}
        clientName={selectedOrderData?.clientName || ''}
        onConfirm={handleConfirmPayment}
      />
    </div>
  )
}
