import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { resumoAcertosService } from '@/services/resumoAcertosService'
import { caixaService, CaixaSummaryRow } from '@/services/caixaService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { Rota } from '@/types/rota'
import { FinancialSummaryTable } from '@/components/caixa/FinancialSummaryTable'
import { ExpenseFormDialog } from '@/components/caixa/ExpenseFormDialog'

export default function CaixaPage() {
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [data, setData] = useState<CaixaSummaryRow[]>([])
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchRoutes = async () => {
    try {
      const allRoutes = await resumoAcertosService.getAllRoutes()
      setRoutes(allRoutes)
      if (allRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(allRoutes[0].id.toString())
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar rotas.',
        variant: 'destructive',
      })
    }
  }

  const fetchData = async (routeId: string) => {
    if (!routeId) return
    setLoading(true)
    try {
      const route = routes.find((r) => r.id.toString() === routeId)
      if (route) {
        const summary = await caixaService.getFinancialSummary(route)
        setData(summary)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados do caixa.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  useEffect(() => {
    if (selectedRouteId && routes.length > 0) {
      fetchData(selectedRouteId)
    }
  }, [selectedRouteId, routes])

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)

  // Totals for Cards
  const totalRecebido = data.reduce((acc, row) => acc + row.totalRecebido, 0)
  const totalDespesas = data.reduce((acc, row) => acc + row.totalDespesas, 0)
  const totalSaldo = totalRecebido - totalDespesas

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caixa</h1>
            <p className="text-muted-foreground">
              Gestão de fluxo de caixa e despesas diárias.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsExpenseDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Cadastrar Despesa
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchData(selectedRouteId)}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Route Selector */}
      <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Período / Rota
              </CardTitle>
              <CardDescription>
                Selecione a rota para visualizar o balanço financeiro.
              </CardDescription>
            </div>
            <div className="w-full md:w-[300px]">
              <Select
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rota" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      Rota #{route.id} (
                      {safeFormatDate(route.data_inicio, 'dd/MM')}
                      {route.data_fim
                        ? ` - ${safeFormatDate(route.data_fim, 'dd/MM')}`
                        : ' - Atual'}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedRoute ? (
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Início:</span>
                <span className="font-medium">
                  {safeFormatDate(selectedRoute.data_inicio)}
                </span>
              </div>
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Fim:</span>
                <span className="font-medium">
                  {selectedRoute.data_fim
                    ? safeFormatDate(selectedRoute.data_fim)
                    : 'Em andamento'}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Financial Totalizers */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Entradas (Recebimentos)
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(totalRecebido)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Saídas (Despesas)
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              R$ {formatCurrency(totalDespesas)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Saldo em Caixa
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              R$ {formatCurrency(totalSaldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Balanço por Funcionário</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <FinancialSummaryTable data={data} />
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        onSuccess={() => fetchData(selectedRouteId)}
      />
    </div>
  )
}
