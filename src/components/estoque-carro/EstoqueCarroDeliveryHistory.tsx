import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import {
  DeliveryHistoryRow,
  DeliveryHistoryFilter,
} from '@/types/delivery_history'
import { safeFormatDate } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export function EstoqueCarroDeliveryHistory() {
  const [data, setData] = useState<DeliveryHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<DeliveryHistoryFilter>({
    startDate: '',
    endDate: '',
    search: '',
  })
  const { toast } = useToast()
  const pageSize = 20

  useEffect(() => {
    fetchData()
  }, [page, filters.startDate, filters.endDate]) // Debounce search manually

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: rows, count } =
        await estoqueCarroService.getDeliveryHistory(page, pageSize, filters)
      setData(rows)
      setTotalPages(Math.ceil(count / pageSize))
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar histórico de entregas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchData()
  }

  const handleExport = async () => {
    try {
      toast({ title: 'Gerando exportação...' })
      const allData =
        await estoqueCarroService.getAllDeliveryHistoryForExport(filters)

      const headers = [
        'Data',
        'Pedido',
        'Cód. Cliente',
        'Nome Cliente',
        'Cód. Produto',
        'Produto',
        'Quantidade',
        'Funcionário',
      ]

      const csvRows = [
        headers.join(','),
        ...allData.map((row) =>
          [
            row.data_movimento ? safeFormatDate(row.data_movimento) : '-',
            row.pedido || '',
            row.codigo_cliente || '',
            `"${(row.nome_cliente || '').replace(/"/g, '""')}"`,
            row.codigo_produto || '',
            `"${(row.produto || '').replace(/"/g, '""')}"`,
            row.quantidade || 0,
            `"${(row.funcionario || '').replace(/"/g, '""')}"`,
          ].join(','),
        ),
      ]

      const blob = new Blob([csvRows.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `historico_entregas_${new Date().toISOString().split('T')[0]}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({ title: 'Exportação concluída' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na exportação',
        description: 'Falha ao gerar arquivo CSV.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-card p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="space-y-1">
            <label className="text-sm font-medium">Data Início</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                setPage(1)
              }}
              className="w-full sm:w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Data Fim</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                setPage(1)
              }}
              className="w-full sm:w-40"
            />
          </div>
          <div className="space-y-1 flex-1 sm:min-w-[200px]">
            <label className="text-sm font-medium">
              Buscar (Cliente/Produto)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite para buscar..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleExport}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cód. Prod</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead>Funcionário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {safeFormatDate(row.data_movimento)}
                  </TableCell>
                  <TableCell>{row.pedido || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {row.nome_cliente || 'N/D'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Cod: {row.codigo_cliente || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {row.codigo_produto}
                  </TableCell>
                  <TableCell>{row.produto}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {row.quantidade}
                  </TableCell>
                  <TableCell className="text-sm">{row.funcionario}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => Math.max(old - 1, 1))}
          disabled={page === 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => Math.min(old + 1, totalPages))}
          disabled={page === totalPages || totalPages === 0 || loading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
