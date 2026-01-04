import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { UserX, Loader2, AlertCircle } from 'lucide-react'
import { cobrancaService } from '@/services/cobrancaService'
import { ClientDebt } from '@/types/cobranca'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'

export default function InactiveClientsPage() {
  const [data, setData] = useState<ClientDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Fetch all debts and filter by inactive status on the client side
    // as cobrancaService is the most robust way to get accurate debt info.
    cobrancaService
      .getDebts()
      .then((allDebts) => {
        // Filter clients with situacao = 'INATIVO'
        // If situacao is not present in some rows, default is ATIVO, so they are filtered out
        const inactive = allDebts.filter((c) => c.situacao === 'INATIVO')
        setData(inactive)
      })
      .catch((err) => {
        console.error(err)
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserX className="h-8 w-8 text-primary" />
          Confirmar cliente INATIVO
        </h1>
        <p className="text-muted-foreground">
          Gerenciamento de clientes que finalizaram acerto sem estoque.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes Inativos</CardTitle>
          <CardDescription>
            Lista de clientes marcados como INATIVO. Verifique se possuem
            débitos pendentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <p>Erro ao carregar dados dos clientes inativos.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número do Pedido</TableHead>
                    <TableHead>Data do Acerto</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Débito Total</TableHead>
                    <TableHead className="text-center w-[120px]">
                      Confirmação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center h-24 text-muted-foreground"
                      >
                        Nenhum cliente inativo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((client) => {
                      const lastOrder = client.orders[client.orders.length - 1]

                      return (
                        <TableRow key={client.clientId}>
                          <TableCell className="font-mono font-medium">
                            {lastOrder ? `#${lastOrder.orderId}` : '-'}
                          </TableCell>
                          <TableCell>
                            {lastOrder
                              ? safeFormatDate(lastOrder.date, 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {lastOrder?.employeeName || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {client.clientName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ID: {client.clientId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-medium ${client.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            R$ {formatCurrency(client.totalDebt)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={true} // Default to checked as they ARE inactive
                                disabled={true} // Read only for now, as requirements are vague on action
                                aria-label="Confirmado"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
