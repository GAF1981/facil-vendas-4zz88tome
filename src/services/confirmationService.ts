import { supabase } from '@/lib/supabase/client'
import { reportsService } from './reportsService'
import { parseCurrency } from '@/lib/formatters'

export interface ConfirmationRow {
  orderId: number
  clientCode: number
  date: string
  employee: string
  monthlyAverage: number | null
  totalSale: number
  amountToPay: number
  paidAmount: number
  registeredAmount: number
  remainingAmount: number
  pixAmount: number
  pixDescription: string
}

export const confirmationService = {
  async getConfirmationData(): Promise<ConfirmationRow[]> {
    // 1. Fetch Orders from BANCO_DE_DADOS
    const { data: ordersData, error: ordersError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "CLIENTE", "VALOR VENDIDO", "SALDO FINAL", "VALOR DEVIDO", "FUNCIONÁRIO", "CÓDIGO DO CLIENTE"',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .not('"DATA DO ACERTO"', 'is', null)
      .limit(5000)

    if (ordersError) throw ordersError

    // 2. Fetch Receipts
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('RECEBIMENTOS')
      .select('venda_id, valor_pago, valor_registrado, forma_pagamento')
      .limit(10000)

    if (receiptsError) throw receiptsError

    // 3. Fetch Projections for Media Mensal logic
    const projections = await reportsService.getProjectionsReport()
    const projectionMap = new Map<number, number>()
    projections.forEach((p) => {
      if (p.monthlyAverage !== null && !projectionMap.has(p.clientCode)) {
        projectionMap.set(p.clientCode, p.monthlyAverage)
      }
    })

    // Process Data
    const ordersMap = new Map<number, ConfirmationRow>()

    // Aggregate Orders
    ordersData?.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        const clientId = row['CÓDIGO DO CLIENTE']
        const monthlyAverage = projectionMap.get(clientId) || null

        ordersMap.set(orderId, {
          orderId,
          clientCode: clientId || 0,
          date: row['DATA DO ACERTO'],
          employee: row['FUNCIONÁRIO'] || 'N/D',
          monthlyAverage,
          totalSale: 0,
          amountToPay: 0,
          paidAmount: 0,
          registeredAmount: 0,
          remainingAmount: 0,
          pixAmount: 0,
          pixDescription: '',
        })
      }

      const order = ordersMap.get(orderId)!
      order.totalSale += parseCurrency(row['VALOR VENDIDO'])

      if (row['VALOR DEVIDO'] != null) {
        order.amountToPay += row['VALOR DEVIDO']
      }
    })

    // Aggregate Receipts
    receiptsData?.forEach((rec: any) => {
      const orderId = rec.venda_id
      const order = ordersMap.get(orderId)
      if (!order) return

      const registered = rec.valor_registrado || 0
      const paid = rec.valor_pago || 0
      const method = (rec.forma_pagamento || '').toLowerCase()

      order.paidAmount += paid
      order.registeredAmount += registered

      // Focus on Pix: Aggregate Pix amount and description
      if (method.includes('pix')) {
        order.pixAmount += paid
        const desc = rec.forma_pagamento || 'Pix'
        // Add description if not already present to avoid duplicates like "Pix Bradesco, Pix Bradesco"
        if (!order.pixDescription.includes(desc)) {
          order.pixDescription = order.pixDescription
            ? `${order.pixDescription}, ${desc}`
            : desc
        }
      }
    })

    // Post-Process
    const result = Array.from(ordersMap.values())
      .map((order) => {
        return {
          ...order,
          remainingAmount: order.registeredAmount - order.paidAmount,
        }
      })
      // Filter for orders with remaining amount AND that have Pix payments involved
      .filter((o) => o.remainingAmount > 0.05 && o.pixAmount > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return result
  },

  async confirmPayment(
    orderId: number,
    methods: {
      pix?: boolean
    },
  ) {
    const { data: receipts, error: fetchError } = await supabase
      .from('RECEBIMENTOS')
      .select('id, forma_pagamento, valor_registrado, valor_pago')
      .eq('venda_id', orderId)

    if (fetchError) throw fetchError

    const updates = []

    for (const rec of receipts || []) {
      const method = (rec.forma_pagamento || '').toLowerCase()
      let shouldUpdate = false

      if (methods.pix && method.includes('pix')) shouldUpdate = true

      // Confirm payment by setting valor_pago to valor_registrado
      if (shouldUpdate && rec.valor_registrado > rec.valor_pago) {
        updates.push(
          supabase
            .from('RECEBIMENTOS')
            .update({ valor_pago: rec.valor_registrado })
            .eq('id', rec.id),
        )
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates)
    }
  },
}
