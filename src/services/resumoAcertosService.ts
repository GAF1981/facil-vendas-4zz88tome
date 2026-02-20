import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'
import { Rota } from '@/types/rota'

export interface SettlementSummary {
  orderId: number
  employee: string
  employeeId?: number | null
  clientCode: number
  clientName: string
  acertoDate: string
  acertoTime: string
  totalSalesValue: number
  paymentFormsBD: string
  payments: {
    method: string
    value: number
  }[]
  totalPaid: number
  totalDiscount: number
  valorDevido: number
}

export const resumoAcertosService = {
  async getAllRoutes() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return data as Rota[]
  },

  async getLatestRoute() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async getRouteById(id: number) {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Rota
  },

  async finishAndStartNewRoute(currentRouteId: number) {
    const now = new Date().toISOString()

    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: now,
      })
      .eq('id', currentRouteId)

    if (endError) throw endError

    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || currentRouteId) + 1

    const { data: newRota, error: startError } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: now,
      })
      .select()
      .single()

    if (startError) throw startError

    return newRota as Rota
  },

  async getSettlements(rota: Rota) {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const datePartStart = rota.data_inicio.split('T')[0]
    const datePartEnd = rota.data_fim ? rota.data_fim.split('T')[0] : null

    let query = supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .gte('"DATA DO ACERTO"', datePartStart)
      .not('"NÚMERO DO PEDIDO"', 'is', null)

    if (datePartEnd) {
      query = query.lte('"DATA DO ACERTO"', datePartEnd)
    }

    const { data: dbData, error: dbError } = await query

    if (dbError) throw dbError

    const ordersMap = new Map<number, SettlementSummary>()

    dbData?.forEach((row: any) => {
      const dateStr = row['DATA DO ACERTO']
      const timeStr = row['HORA DO ACERTO'] || '00:00:00'
      if (!dateStr) return

      const rowDateTimeStr = `${dateStr}T${timeStr}`
      let rowDateTime: Date
      try {
        rowDateTime = parseISO(rowDateTimeStr)
      } catch (e) {
        return
      }

      const isAfterOrEqualStart =
        isAfter(rowDateTime, routeStart) || isEqual(rowDateTime, routeStart)
      const isBeforeOrEqualEnd =
        isBefore(rowDateTime, routeEnd) || isEqual(rowDateTime, routeEnd)

      if (!isAfterOrEqualStart) return
      if (rota.data_fim && !isBeforeOrEqualEnd) return

      const orderId = row['NÚMERO DO PEDIDO']
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId,
          employee: row['FUNCIONÁRIO'] || 'N/D',
          employeeId: row['CODIGO FUNCIONARIO'],
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          acertoDate: dateStr,
          acertoTime: timeStr,
          totalSalesValue: 0,
          paymentFormsBD: row['FORMA'] || '',
          payments: [],
          totalPaid: 0,
          totalDiscount: 0,
          valorDevido: 0,
        })
      }

      const order = ordersMap.get(orderId)!
      const itemValue = parseCurrency(row['VALOR VENDA PRODUTO'])
      order.totalSalesValue += itemValue

      const discountStr = row['DESCONTO POR GRUPO'] || '0'
      if (discountStr.includes('%')) {
        const pct = parseCurrency(discountStr.replace('%', ''))
        order.totalDiscount += itemValue * (pct / 100)
      } else {
        order.totalDiscount = parseCurrency(discountStr)
      }
    })

    const orderIds = Array.from(ordersMap.keys())

    if (orderIds.length > 0) {
      const { data: payData, error: payError } = await supabase
        .from('RECEBIMENTOS')
        .select('venda_id, forma_pagamento, valor_pago')
        .in('venda_id', orderIds)

      if (payError) throw payError

      payData?.forEach((p: any) => {
        const order = ordersMap.get(p.venda_id)
        if (order) {
          if (p.valor_pago > 0) {
            order.payments.push({
              method: p.forma_pagamento,
              value: p.valor_pago,
            })
            order.totalPaid += p.valor_pago
          }
        }
      })
    }

    ordersMap.forEach((order) => {
      const netValue = order.totalSalesValue - order.totalDiscount
      order.valorDevido = Math.max(0, netValue - order.totalPaid)
    })

    return Array.from(ordersMap.values()).sort((a, b) => b.orderId - a.orderId)
  },
}
