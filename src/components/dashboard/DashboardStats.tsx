import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import {
  DollarSign,
  TrendingUp,
  Map as MapIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { dashboardService } from '@/services/dashboardService'
import { DashboardMetrics } from '@/types/dashboard'
import { formatCurrency } from '@/lib/formatters'

export function DashboardStats() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSalesToday: 0,
    totalReceiptsToday: 0,
    activeRoutes: 0,
    totalDebt: 0,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    const fetchMetrics = async () => {
      try {
        const data = await dashboardService.getMetrics()
        if (mounted) {
          setMetrics({ ...data, loading: false })
        }
      } catch (error) {
        console.error(error)
        if (mounted) {
          setMetrics((prev) => ({ ...prev, loading: false }))
        }
      }
    }

    fetchMetrics()

    return () => {
      mounted = false
    }
  }, [])

  if (metrics.loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8 animate-fade-in">
      <MetricCard
        title="Vendas Hoje"
        value={`R$ ${formatCurrency(metrics.totalSalesToday || 0)}`}
        description="Total vendido hoje"
        icon={DollarSign}
        iconClassName="text-green-600"
      />
      <MetricCard
        title="Recebimentos Hoje"
        value={`R$ ${formatCurrency(metrics.totalReceiptsToday || 0)}`}
        description="Valor recebido hoje"
        icon={TrendingUp}
        iconClassName="text-blue-600"
      />
      <MetricCard
        title="Débito Total"
        value={`R$ ${formatCurrency(metrics.totalDebt || 0)}`}
        description="Total em aberto"
        icon={AlertCircle}
        iconClassName="text-red-600"
      />
      <MetricCard
        title="Rotas Ativas"
        value={metrics.activeRoutes || 0}
        description="Rotas em andamento"
        icon={MapIcon}
        iconClassName="text-purple-600"
      />
    </div>
  )
}
