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
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { stockReportService } from '@/services/stockReportService'
import { StockFinalReportRow } from '@/types/stockReport'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { toast } from 'sonner'

export default function StockReportsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<StockFinalReportRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await stockReportService.getStockFinalReport()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch stock report', error)
      toast.error('Erro ao carregar relatório de estoque.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

      <Card>
        <CardHeader>
          <CardTitle>Quantidade de Estoque Final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nº Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cód. Cliente</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cód. Produto</TableHead>
                  <TableHead>Mercadoria</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                  <TableHead className="text-right">Preço Vendido</TableHead>
                  <TableHead className="text-right">
                    Valor Estoque (Prod)
                  </TableHead>
                  <TableHead className="text-right">
                    Valor Estoque (Total)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row['NUMERO DO PEDIDO']}</TableCell>
                      <TableCell>
                        {safeFormatDate(row['DATA E HORA DO ACERTO'])}
                      </TableCell>
                      <TableCell>{row['CÓDIGO DO CLIENTE']}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={row['CLIENTE'] || ''}
                      >
                        {row['CLIENTE']}
                      </TableCell>
                      <TableCell>{row['CÓDIGO DO PRODUTO']}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={row['MERCADORIA'] || ''}
                      >
                        {row['MERCADORIA']}
                      </TableCell>
                      <TableCell className="text-right">
                        {row['SALDO FINAL']}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row['PREÇO VENDIDO'] || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row['VALOR ESTOQUE POR PRODUTO'] || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(row['VALOR ESTOQUE SALDO FINAL'] || 0)}
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
