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
import { PixAcertoRow, PixRecebimentoRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'

type Tab = 'acerto' | 'recebimento'

export default function PixPage() {
  const [activeTab, setActiveTab] = useState<Tab>('acerto')
  const [acertoData, setAcertoData] = useState<PixAcertoRow[]>([])
  const [recebimentoData, setRecebimentoData] = useState<PixRecebimentoRow[]>(
    [],
  )
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const { employee } = useUserStore()

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'acerto') {
        const data = await pixService.getPixAcertos()
        setAcertoData(data)
      } else {
        const data = await pixService.getPixRecebimentos()
        setRecebimentoData(data)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados Pix.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const handleToggleAcerto = async (orderId: number, checked: boolean) => {
    if (!employee) return
    const prev = [...acertoData]
    // Optimistic
    setAcertoData((curr) =>
      curr.map((r) =>
        r.orderId === orderId
          ? {
              ...r,
              isConfirmed: checked,
              confirmedBy: checked ? employee.nome_completo : undefined,
            }
          : r,
      ),
    )

    try {
      await pixService.toggleAcertoPix(orderId, checked, employee.nome_completo)
      toast({
        title: checked ? 'Confirmado' : 'Cancelado',
        className: checked
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white',
        description: `Status atualizado por ${employee.nome_completo}`,
        duration: 1500,
      })
    } catch (error) {
      setAcertoData(prev)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o status.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleRecebimento = async (id: number, checked: boolean) => {
    if (!employee) return
    const prev = [...recebimentoData]
    // Optimistic
    setRecebimentoData((curr) =>
      curr.map((r) =>
        r.id === id
          ? {
              ...r,
              isConfirmed: checked,
              confirmedBy: checked ? employee.nome_completo : undefined,
            }
          : r,
      ),
    )

    try {
      await pixService.toggleRecebimentoPix(id, checked, employee.nome_completo)
      toast({
        title: checked ? 'Confirmado' : 'Cancelado',
        className: checked
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white',
        description: `Status atualizado por ${employee.nome_completo}`,
        duration: 1500,
      })
    } catch (error) {
      setRecebimentoData(prev)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o status.',
        variant: 'destructive',
      })
    }
  }

  // Filter
  const filteredAcertos = acertoData.filter((r) => {
    const s = searchTerm.toLowerCase()
    return (
      r.clientName.toLowerCase().includes(s) ||
      r.orderId.toString().includes(s) ||
      r.clientCode.toString().includes(s) ||
      r.employeeName.toLowerCase().includes(s) ||
      (r.isConfirmed ? 'confirmado' : 'a confirmar').includes(s)
    )
  })

  const filteredRecebimentos = recebimentoData.filter((r) => {
    const s = searchTerm.toLowerCase()
    return (
      r.orderId.toString().includes(s) ||
      r.clientCode.toString().includes(s) ||
      (r.isConfirmed ? 'confirmado' : 'a confirmar').includes(s)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pix</h1>
            <p className="text-muted-foreground">
              Central de confirmação de transações Pix.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            variant={activeTab === 'acerto' ? 'default' : 'outline'}
            onClick={() => setActiveTab('acerto')}
            className={cn(
              activeTab === 'acerto' && 'bg-teal-600 hover:bg-teal-700',
            )}
          >
            Confirmar Pix Acerto
          </Button>
          <Button
            variant={activeTab === 'recebimento' ? 'default' : 'outline'}
            onClick={() => setActiveTab('recebimento')}
            className={cn(
              activeTab === 'recebimento' && 'bg-teal-600 hover:bg-teal-700',
            )}
          >
            Confirmar Pix Recebimento
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-card p-2 rounded-lg border shadow-sm max-w-md w-full">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 h-8"
          />
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      {activeTab === 'acerto' ? (
        <Card>
          <CardHeader>
            <CardTitle>Pix Acertos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[100px]">Pedido</TableHead>
                    <TableHead className="w-[80px]">Cód.</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-[150px]">
                      Conf. Receb.
                    </TableHead>
                    <TableHead>Confirmado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                          Carregando...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAcertos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAcertos.map((row) => (
                      <TableRow key={row.orderId} className="hover:bg-muted/30">
                        <TableCell className="font-mono">
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
                        <TableCell className="text-right font-mono font-medium">
                          R$ {formatCurrency(row.value)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Checkbox
                              checked={row.isConfirmed}
                              onCheckedChange={(c) =>
                                handleToggleAcerto(row.orderId, c as boolean)
                              }
                              className="data-[state=checked]:bg-green-600 border-gray-400"
                            />
                            <span
                              className={cn(
                                'text-[10px] font-bold uppercase',
                                row.isConfirmed
                                  ? 'text-green-600'
                                  : 'text-red-500',
                              )}
                            >
                              {row.isConfirmed ? 'Confirmado' : 'A Confirmar'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.confirmedBy || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pix Recebimentos Avulsos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[100px]">Pedido</TableHead>
                    <TableHead className="w-[80px]">Cód.</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">
                      Valor Avulso Receb.
                    </TableHead>
                    <TableHead className="text-center w-[180px]">
                      Conf. Receb. Avulso
                    </TableHead>
                    <TableHead>Confirmado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                          Carregando...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredRecebimentos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecebimentos.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono">
                          #{row.orderId}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.paymentMethod}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          R$ {formatCurrency(row.value)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Checkbox
                              checked={row.isConfirmed}
                              onCheckedChange={(c) =>
                                handleToggleRecebimento(row.id, c as boolean)
                              }
                              className="data-[state=checked]:bg-green-600 border-gray-400"
                            />
                            <span
                              className={cn(
                                'text-[10px] font-bold uppercase',
                                row.isConfirmed
                                  ? 'text-green-600'
                                  : 'text-red-500',
                              )}
                            >
                              {row.isConfirmed ? 'Confirmado' : 'A Confirmar'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.confirmedBy || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
