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
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, Search, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { reportsService, ProjectionReportRow } from '@/services/reportsService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

const ProjectionsPage = () => {
  const [data, setData] = useState<ProjectionReportRow[]>([])
  const [filteredData, setFilteredData] = useState<ProjectionReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const result = await reportsService.getProjectionsReport()
        setData(result)
        setFilteredData(result)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar o relatório de projeções.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [toast])

  useEffect(() => {
    const lowerSearch = search.toLowerCase()
    const filtered = data.filter(
      (item) =>
        item.clientName.toLowerCase().includes(lowerSearch) ||
        item.clientCode.toString().includes(lowerSearch) ||
        item.orderId.toString().includes(lowerSearch),
    )
    setFilteredData(filtered)
  }, [search, data])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/relatorio')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Projeções e Médias
          </h1>
          <p className="text-muted-foreground">
            Análise de frequência de vendas e desempenho financeiro.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Histórico de Pedidos Recentes
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou pedido..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Cód. Cliente</TableHead>
                    <TableHead>Nome do Cliente</TableHead>
                    <TableHead className="w-[120px]">Nº Pedido</TableHead>
                    <TableHead className="w-[150px]">Data do Pedido</TableHead>
                    <TableHead className="text-right">
                      Valor Total de Venda
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row) => (
                      <TableRow key={row.orderId} className="hover:bg-muted/30">
                        <TableCell className="font-mono">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.clientName}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          #{row.orderId}
                        </TableCell>
                        <TableCell>
                          {row.orderDate
                            ? format(parseISO(row.orderDate), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          R$ {formatCurrency(row.totalValue)}
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

export default ProjectionsPage
