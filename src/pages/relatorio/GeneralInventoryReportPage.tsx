import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Box,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import {
  InventoryGeneralSession,
  InventoryReportMetrics,
} from '@/types/inventory_general'
import { safeFormatDate, formatCurrency } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function GeneralInventoryReportPage() {
  const [sessions, setSessions] = useState<InventoryGeneralSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [metrics, setMetrics] = useState<InventoryReportMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadSessions = useCallback(async () => {
    try {
      const data = await inventoryGeneralService.getSessions()
      setSessions(data)
      if (data.length > 0) {
        setSelectedSessionId(data[0].id.toString())
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sessões.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const loadMetrics = useCallback(
    async (id: number) => {
      setLoading(true)
      try {
        const data = await inventoryGeneralService.getReportMetrics(id)
        setMetrics(data)
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar métricas.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (selectedSessionId) {
      loadMetrics(Number(selectedSessionId))
    }
  }, [selectedSessionId, loadMetrics])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/relatorio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório de Estoque Geral
          </h1>
          <p className="text-muted-foreground">
            Métricas de diferenças, compras e desempenho do inventário.
          </p>
        </div>
      </div>

      <div className="flex items-end gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 max-w-md space-y-2">
          <Label>Selecione o Inventário</Label>
          <Select
            value={selectedSessionId}
            onValueChange={setSelectedSessionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um inventário" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  #{session.id} - {safeFormatDate(session.data_inicio)} (
                  {session.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Section 1: Diferenças */}
        <Card className="border-l-4 border-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <CardTitle>Diferenças</CardTitle>
            </div>
            <CardDescription>Ajustes de estoque no inventário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Diferença Quantidade
              </p>
              <p
                className={`text-2xl font-bold ${metrics && metrics.diferencas.quantidade < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {metrics ? metrics.diferencas.quantidade : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Diferença Valor
              </p>
              <p
                className={`text-2xl font-bold ${metrics && metrics.diferencas.valor < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {metrics ? formatCurrency(metrics.diferencas.valor) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Compras */}
        <Card className="border-l-4 border-green-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <CardTitle>Compras</CardTitle>
            </div>
            <CardDescription>Performance de aquisições</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Comprado (Qtd)
              </p>
              <p className="text-2xl font-bold">
                {metrics ? metrics.compras.total_quantidade : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Preço Médio (Total)
              </p>
              <p className="text-2xl font-bold">
                {metrics ? formatCurrency(metrics.compras.preco_medio) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Outros */}
        <Card className="border-l-4 border-gray-300 border-dashed bg-muted/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                <Box className="w-5 h-5" />
              </div>
              <CardTitle>Outros</CardTitle>
            </div>
            <CardDescription>Métricas futuras</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[120px] text-muted-foreground text-sm italic">
            Em desenvolvimento...
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
