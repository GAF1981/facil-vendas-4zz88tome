import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { startOfDay, endOfDay, format } from 'date-fns'
import { DashboardMetrics } from '@/types/dashboard'

export const dashboardService = {
  async getMetrics(): Promise<Omit<DashboardMetrics, 'loading'>> {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const todayStart = startOfDay(today).toISOString()
    const todayEnd = endOfDay(today).toISOString()

    try {
      // 1. Total Sales Today
      // Fetching VALOR VENDIDO from BANCO_DE_DADOS for today
      // Using safe selection and JS summation since value is a currency string
      const { data: salesData, error: salesError } = await supabase
        .from('BANCO_DE_DADOS')
        .select('VALOR VENDIDO')
        .eq('DATA DO ACERTO', todayStr)

      if (salesError) throw salesError

      const totalSalesToday = (salesData || []).reduce((acc, row) => {
        if (!row || !row['VALOR VENDIDO']) return acc
        return acc + parseCurrency(row['VALOR VENDIDO'])
      }, 0)

      // 2. Total Receipts Today
      // Fetching valor_pago from RECEBIMENTOS for today
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('RECEBIMENTOS')
        .select('valor_pago')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      if (receiptsError) throw receiptsError

      const totalReceiptsToday = (receiptsData || []).reduce((acc, row) => {
        if (!row || typeof row.valor_pago !== 'number') return acc
        return acc + (row.valor_pago || 0)
      }, 0)

      // 3. Active Routes
      // Counting ROTA where data_fim is null
      const { count: activeRoutes, error: routesError } = await supabase
        .from('ROTA')
        .select('*', { count: 'exact', head: true })
        .is('data_fim', null)

      if (routesError) throw routesError

      // 4. Total Debt
      // Fetching aggregate debt from debitos_historico
      // We only fetch the 'debito' column to minimize data transfer
      const { data: debtData, error: debtError } = await supabase
        .from('debitos_historico')
        .select('debito')
        .gt('debito', 0)

      if (debtError) throw debtError

      const totalDebt = (debtData || []).reduce((acc, row) => {
        if (!row || typeof row.debito !== 'number') return acc
        return acc + (row.debito || 0)
      }, 0)

      return {
        totalSalesToday,
        totalReceiptsToday,
        activeRoutes: activeRoutes || 0,
        totalDebt,
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      // Return zeroed metrics on error to prevent UI crash
      return {
        totalSalesToday: 0,
        totalReceiptsToday: 0,
        activeRoutes: 0,
        totalDebt: 0,
      }
    }
  },
}
