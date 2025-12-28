import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientRow } from '@/types/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, FileText, SearchX } from 'lucide-react'

interface ClientHistoryDialogProps {
  client: ClientRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface HistoryItem {
  id: number
  data: string
  valorVendaTotal: number
  methods: string
}

export function ClientHistoryDialog({
  client,
  open,
  onOpenChange,
}: ClientHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && client) {
      const fetchHistory = async () => {
        setLoading(true)
        try {
          const data = await bancoDeDadosService.getAcertoHistory(client.CODIGO)
          setHistory(data)
        } catch (error) {
          console.error('Failed to fetch client history', error)
        } finally {
          setLoading(false)
        }
      }

      fetchHistory()
    }
  }, [open, client])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resumo de Acerto (Histórico)
          </DialogTitle>
          <DialogDescription>
            Histórico de transações para o cliente{' '}
            <span className="font-semibold text-foreground">
              {client?.['NOME CLIENTE']}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-[300px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : history.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Data do Acerto</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Número do Pedido
                    </TableHead>
                    <TableHead className="text-right">Valor Vendido</TableHead>
                    <TableHead className="text-right">
                      Forma de Pagamento
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {item.data
                          ? format(parseISO(item.data), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        #{item.id}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {formatCurrency(item.valorVendaTotal)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.methods}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground p-8">
              <SearchX className="h-10 w-10 opacity-20" />
              <p>Nenhum histórico de acerto encontrado para este cliente.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
