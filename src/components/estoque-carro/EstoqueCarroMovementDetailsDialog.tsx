import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  productId: number
  productName: string
}

export function EstoqueCarroMovementDetailsDialog({
  open,
  onOpenChange,
  sessionId,
  productId,
  productName,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [movements, setMovements] = useState<any[]>([])

  useEffect(() => {
    if (open && sessionId && productId) {
      loadMovements()
    }
  }, [open, sessionId, productId])

  const loadMovements = async () => {
    setLoading(true)
    try {
      const data = await estoqueCarroService.getMovementDetails(
        sessionId,
        productId,
      )
      setMovements(data)
    } catch (error) {
      console.error('Failed to load details', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ENTRADAS_cliente_carro':
        return { label: 'Recolhido (Cliente)', color: 'text-green-600' }
      case 'SAIDAS_carro_cliente':
        return { label: 'Consignado (Cliente)', color: 'text-red-600' }
      case 'ENTRADAS_estoque_carro':
        return { label: 'Entrada Estoque', color: 'text-blue-600' }
      case 'SAIDAS_carro_estoque':
        return { label: 'Devolução Estoque', color: 'text-orange-600' }
      default:
        return { label: type, color: '' }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes: {productName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Nenhuma movimentação detalhada encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov, idx) => {
                  const { label, color } = getTypeLabel(mov.movement_type)
                  const qtd =
                    mov.quantidade ||
                    mov.ENTRADAS_cliente_carro ||
                    mov.SAIDAS_carro_cliente ||
                    mov.ENTRADAS_estoque_carro ||
                    mov.SAIDAS_carro_estoque ||
                    0

                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        {safeFormatDate(
                          mov.created_at || mov.data_horario,
                          'dd/MM HH:mm',
                        )}
                      </TableCell>
                      <TableCell className={color}>{label}</TableCell>
                      <TableCell>
                        {mov.pedido ? `#${mov.pedido}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {qtd}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
