import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'

export interface ProjectionReportRow {
  orderId: number
  clientCode: number
  clientName: string
  orderDate: string
  totalValue: number
}

export const reportsService = {
  async getProjectionsReport(): Promise<ProjectionReportRow[]> {
    // Fetch recent transactions
    // Using simple limit for now as per requirements to get real data quickly
    // Aggregation is done client-side because of item-level granularity in DB
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", "HORA DO ACERTO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(5000)

    if (error) throw error

    const ordersMap = new Map<number, ProjectionReportRow>()

    data?.forEach((row) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      const val = parseCurrency(row['VALOR VENDIDO'])

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId: orderId,
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          orderDate: row['DATA DO ACERTO'] || '',
          totalValue: 0,
        })
      }

      const order = ordersMap.get(orderId)!
      order.totalValue += val
    })

    return Array.from(ordersMap.values())
  },
}
