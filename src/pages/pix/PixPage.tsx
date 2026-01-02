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
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, Search, QrCode } from 'lucide-react'
import { pixService } from '@/services/pixService'
import { PixTransactionRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'

export default function PixPage() {
  const [transactions, setTransactions] = useState<PixTransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await pixService.getPixTransactions()
      setTransactions(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as transações Pix.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleAcerto = async (orderId: number, checked: boolean) => {
    // Optimistic Update
    setTransactions((prev) =>
      prev.map((t) =>
        t.orderId === orderId ? { ...t, acertoPixConfirmed: checked } : t,
      ),
    )

    try {
      await pixService.toggleAcertoPix(orderId, checked)
      toast({
        title: checked ? 'Confirmado' : 'Desmarcado',
        description: `Pix do Acerto (Pedido #${orderId}) atualizado.`,
        duration: 1500,
      })
    } catch (error) {
      // Revert
      setTransactions((prev) =>
        prev.map((t) =>
          t.orderId === orderId ? { ...t, acertoPixConfirmed: !checked } : t,
        ),
      )
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleRecebimento = async (orderId: number, checked: boolean) => {
    // Optimistic Update
    setTransactions((prev) =>
      prev.map((t) =>
        t.orderId === orderId ? { ...t, recebimentoPixConfirmed: checked } : t,
      ),
    )

    try {
      await pixService.toggleRecebimentoPix(orderId, checked)
      toast({
        title: checked ? 'Confirmado' : 'Desmarcado',
        description: `Pix do Recebimento (Pedido #${orderId}) atualizado.`,
        duration: 1500,
      })
    } catch (error) {
      // Revert
      setTransactions((prev) =>
        prev.map((t) =>
          t.orderId === orderId
            ? { ...t, recebimentoPixConfirmed: !checked }
            : t,
        ),
      )
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status.',
        variant: 'destructive',
      })
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      t.clientName.toLowerCase().includes(searchLower) ||
      t.orderId.toString().includes(searchLower) ||
      t.clientCode.toString().includes(searchLower) ||
      t.employeeName.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Recebimento Pix
            </h1>
            <p className="text-muted-foreground">
              Confirmação de pagamentos Pix em Acertos e Recebimentos.
            </p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <div className="flex items-center bg-card p-4 rounded-lg border shadow-sm max-w-md">
        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por pedido, cliente ou funcionário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações Pix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Pedido</TableHead>
                  <TableHead className="w-[80px]">Cód.</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-right bg-blue-50/50 text-blue-700">
                    Pix Acerto
                  </TableHead>
                  <TableHead className="text-center w-[100px] bg-blue-50/50">
                    Conf. Acerto
                  </TableHead>
                  <TableHead className="text-right bg-green-50/50 text-green-700">
                    Pix Receb.
                  </TableHead>
                  <TableHead className="text-center w-[100px] bg-green-50/50">
                    Conf. Receb.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma transação Pix encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((row) => (
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
                      <TableCell className="font-medium">
                        {row.clientName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.employeeName}
                      </TableCell>

                      {/* Acerto Column */}
                      <TableCell className="text-right font-mono bg-blue-50/20">
                        {row.acertoPixValue > 0 ? (
                          <span className="text-blue-700 font-semibold">
                            R$ {formatCurrency(row.acertoPixValue)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-blue-50/20">
                        <Checkbox
                          checked={row.acertoPixConfirmed}
                          disabled={row.acertoPixValue <= 0}
                          onCheckedChange={(c) =>
                            handleToggleAcerto(row.orderId, c as boolean)
                          }
                          className="data-[state=checked]:bg-blue-600 border-blue-600"
                        />
                      </TableCell>

                      {/* Recebimento Column */}
                      <TableCell className="text-right font-mono bg-green-50/20">
                        {row.recebimentoPixValue > 0 ? (
                          <span className="text-green-700 font-semibold">
                            R$ {formatCurrency(row.recebimentoPixValue)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-green-50/20">
                        <Checkbox
                          checked={row.recebimentoPixConfirmed}
                          disabled={row.recebimentoPixValue <= 0}
                          onCheckedChange={(c) =>
                            handleToggleRecebimento(row.orderId, c as boolean)
                          }
                          className="data-[state=checked]:bg-green-600 border-green-600"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
