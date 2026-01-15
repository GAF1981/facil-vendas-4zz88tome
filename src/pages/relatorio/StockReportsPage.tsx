import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { stockReportService } from '@/services/stockReportService'
import { StockReportRow } from '@/types/stockReport'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { toast } from 'sonner'
import { subDays, format } from 'date-fns'

export default function StockReportsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<StockReportRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 7), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd'),
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await stockReportService.getStockHistory({
        mode: 'history',
        cliente_nome: searchTerm,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      })
      setData(result)
    } catch (error) {
      console.error('Failed to fetch stock history', error)
      toast.error('Erro ao carregar histórico de estoque.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, []) // Initial load

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData()
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/relatorio')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
        <div className="w-full md:w-auto space-y-2">
          <label className="text-sm font-medium">Cliente</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full md:w-[250px]"
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            />
          </div>
        </div>

        <div className="w-full md:w-auto space-y-2">
          <label className="text-sm font-medium">Data Início</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full md:w-[160px]"
          />
        </div>

        <div className="w-full md:w-auto space-y-2">
          <label className="text-sm font-medium">Data Fim</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full md:w-[160px]"
          />
        </div>

        <Button
          onClick={fetchData}
          disabled={loading}
          className="w-full md:w-auto"
        >
          Filtrar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Relatórios de Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Relatório</TableHead>
                  <TableHead>Data Acerto</TableHead>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                  <TableHead className="text-right">Estoque Produto</TableHead>
                  <TableHead className="text-right">Estoque Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Carregando histórico...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Nenhum registro encontrado no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {safeFormatDate(row.created_at)}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(row.data_hora_acerto)}
                      </TableCell>
                      <TableCell>{row.numero_pedido}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={row.cliente_nome || ''}
                      >
                        {row.cliente_nome}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={row.produto_nome || ''}
                      >
                        {row.produto_nome}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.saldo_final}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.estoque_por_produto || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.estoque_final || 0)}
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
