import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { pendenciasService } from './pendenciasService'
import { reportsService } from './reportsService'
import { parseISO, isBefore, startOfDay, subDays } from 'date-fns'

export const rotaService = {
  async getActiveRota() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .is('data_fim', null)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async getLastRota() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .not('data_fim', 'is', null)
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async startRota() {
    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || 0) + 1

    const { data, error } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as Rota
  },

  async endRota(id: number) {
    const { data, error } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Rota
  },

  async finishAndStartNewRoute(currentRotaId: number) {
    const { error: rpcError } = await supabase.rpc(
      'increment_rota_items_on_finalize',
      { p_rota_id: currentRotaId },
    )

    if (rpcError) {
      console.error('Error auto-incrementing x_na_rota:', rpcError)
    }

    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', currentRotaId)

    if (endError) throw endError

    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || currentRotaId) + 1

    const { data: newRota, error: startError } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: new Date().toISOString(),
      })
      .select()
      .single()

    if (startError) throw startError

    return newRota as Rota
  },

  async getRotaItems(rotaId: number) {
    const { data, error } = await supabase
      .from('ROTA_ITEMS')
      .select('*')
      .eq('rota_id', rotaId)

    if (error) throw error
    return data as RotaItem[]
  },

  async upsertRotaItem(
    item: Partial<RotaItem> & { rota_id: number; cliente_id: number },
  ) {
    const { data: existing, error: fetchError } = await supabase
      .from('ROTA_ITEMS')
      .select('id')
      .eq('rota_id', item.rota_id)
      .eq('cliente_id', item.cliente_id)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing) {
      const { data, error } = await supabase
        .from('ROTA_ITEMS')
        .update(item)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('ROTA_ITEMS')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async getFullRotaData(rota: Rota | null) {
    // 1. Fetch all Clients (FILTERED BY 'ATIVO' OR 'INATIVO - ROTA')
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .in('TIPO DE CLIENTE', ['ATIVO', 'INATIVO - ROTA'])
      .order('CODIGO', { ascending: false })
      .limit(50000)

    if (clientsError) throw clientsError
    if (!clients) return []

    // 2. Optimized Debt Fetching using debitos_historico (Source of Truth)
    const { data: debtData, error: debtError } = await supabase
      .from('debitos_historico')
      .select('cliente_codigo, debito, data_acerto')

    if (debtError) {
      console.error('Error fetching debitos_historico:', debtError)
    }

    const debtMap = new Map<
      number,
      { totalDebt: number; orderCount: number; oldestDate: string | null }
    >()

    if (debtData) {
      debtData.forEach((row) => {
        const cid = row.cliente_codigo
        if (!cid) return

        if (!debtMap.has(cid)) {
          debtMap.set(cid, {
            totalDebt: 0,
            orderCount: 0,
            oldestDate: null,
          })
        }
        const entry = debtMap.get(cid)!
        const val = row.debito || 0

        entry.totalDebt += val

        if (val > 0.01) {
          entry.orderCount += 1

          if (row.data_acerto) {
            if (!entry.oldestDate || row.data_acerto < entry.oldestDate) {
              entry.oldestDate = row.data_acerto
            }
          }
        }
      })
    }

    // 3. Fetch Pendencies
    const allPendencies = await pendenciasService.getAll(false) // Unresolved
    const pendencyMap = new Set(allPendencies.map((p) => p.cliente_id))

    // 4. Fetch Rota Items
    let rotaItemsMap = new Map<number, RotaItem>()
    if (rota) {
      const items = await this.getRotaItems(rota.id)
      items.forEach((i) => rotaItemsMap.set(i.cliente_id, i))
    }

    // 5. Fetch Projections via Reports Service (Linked by Order Number)
    const projectionsReport = await reportsService.getProjectionsReport()
    const orderProjectionMap = new Map<number, number>()
    projectionsReport.forEach((p) => {
      if (p.projection !== null) {
        orderProjectionMap.set(p.orderId, p.projection)
      }
    })

    // 6. Fetch basic Summary Stats (Last Visit Date from debitos_historico or BANCO_DE_DADOS lightweight)
    const { data: dbStats } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"CÓDIGO DO CLIENTE", "DATA DO ACERTO", "NÚMERO DO PEDIDO"')
      .order('DATA DO ACERTO', { ascending: false })
      .limit(50000)

    const statsMap = new Map<
      number,
      {
        lastDate: string | null
        history: Set<string>
        lastOrderId: number | null
      }
    >()

    // Collect Order IDs to fetch stock values later
    const orderIdsForStock = new Set<number>()

    dbStats?.forEach((row: any) => {
      const cid = row['CÓDIGO DO CLIENTE']
      if (!cid) return

      if (!statsMap.has(cid)) {
        statsMap.set(cid, {
          lastDate: null,
          history: new Set(),
          lastOrderId: null,
        })
      }
      const entry = statsMap.get(cid)!

      if (row['DATA DO ACERTO']) {
        entry.history.add(row['DATA DO ACERTO'])
      }

      if (!entry.lastDate) {
        entry.lastDate = row['DATA DO ACERTO']
        if (row['NÚMERO DO PEDIDO']) {
          entry.lastOrderId = row['NÚMERO DO PEDIDO']
          orderIdsForStock.add(row['NÚMERO DO PEDIDO'])
        }
      }
    })

    // 7. Fetch Stock Values from QUANTIDADE DE ESTOQUE FINAL based on collected Orders
    const stockMapByOrder = new Map<number, number>()
    const orderIdsArray = Array.from(orderIdsForStock)

    if (orderIdsArray.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < orderIdsArray.length; i += chunkSize) {
        const chunk = orderIdsArray.slice(i, i + chunkSize)

        // Explicitly casting table name to avoid type errors with spaces if definitions are outdated
        const { data: stockRows, error: stockError } = await supabase
          .from('QUANTIDADE DE ESTOQUE FINAL' as any)
          .select('"NUMERO DO PEDIDO", "VALOR ESTOQUE POR PRODUTO"')
          .in('NUMERO DO PEDIDO', chunk)

        if (stockError) {
          console.error('Error fetching stock final:', stockError)
          continue
        }

        stockRows?.forEach((row: any) => {
          const orderId = row['NUMERO DO PEDIDO']
          const val = row['VALOR ESTOQUE POR PRODUTO'] || 0
          if (orderId) {
            stockMapByOrder.set(
              orderId,
              (stockMapByOrder.get(orderId) || 0) + val,
            )
          }
        })
      }
    }

    // 8. Check for Completed Status
    const completedSet = new Set<number>()
    if (rota) {
      const startDate = parseISO(rota.data_inicio)
      const endDate = rota.data_fim ? parseISO(rota.data_fim) : new Date()

      statsMap.forEach((val, key) => {
        const hasRecent = Array.from(val.history).some((dateStr) => {
          const d = parseISO(dateStr)
          return d >= startDate && d <= endDate
        })
        if (hasRecent) completedSet.add(key)
      })
    }

    const today = startOfDay(new Date())

    return clients.map((client, index) => {
      const cid = client.CODIGO
      const debtEntry = debtMap.get(cid)
      const rotaItem = rotaItemsMap.get(cid)
      const stats = statsMap.get(cid)

      // Projection linked by Order ID
      let projection: number | null = null
      if (stats?.lastOrderId) {
        const p = orderProjectionMap.get(stats.lastOrderId)
        if (p !== undefined) {
          projection = p
        }
      }

      // Stock Value linked by Order ID (NEW)
      let stockValue = 0
      if (stats?.lastOrderId) {
        stockValue = stockMapByOrder.get(stats.lastOrderId) || 0
      }

      // Calculate Status & Earliest Unpaid Date
      let vencimentoStatus: 'VENCIDO' | 'A VENCER' | 'PAGO' | 'SEM DÉBITO' =
        'SEM DÉBITO'
      let earliestUnpaid: string | null = null

      if (debtEntry && debtEntry.totalDebt > 0.05) {
        earliestUnpaid = debtEntry.oldestDate
        if (debtEntry.oldestDate) {
          const date = parseISO(debtEntry.oldestDate)
          if (isBefore(date, subDays(today, 30))) {
            vencimentoStatus = 'VENCIDO'
          } else {
            vencimentoStatus = 'A VENCER'
          }
        } else {
          vencimentoStatus = 'A VENCER'
        }
      }

      return {
        rowNumber: index + 1,
        client,
        x_na_rota: rotaItem?.x_na_rota || 0,
        boleto: rotaItem?.boleto || false,
        agregado: rotaItem?.agregado || false,
        vendedor_id: rotaItem?.vendedor_id || null,
        debito: debtEntry?.totalDebt || 0,
        quant_debito: debtEntry?.orderCount || 0,
        data_acerto: stats?.lastDate || null,
        projecao: projection,
        numero_pedido: stats?.lastOrderId || null,
        estoque: stockValue, // Populated from aggregated stock data
        has_pendency: pendencyMap.has(cid),
        is_completed: completedSet.has(cid),
        earliest_unpaid_date: earliestUnpaid,
        vencimento_status: vencimentoStatus,
      }
    })
  },

  async checkAndDecrementXNaRota(clientId: number, settlementDate: Date) {
    try {
      const activeRota = await this.getActiveRota()
      if (!activeRota) return

      const startDate = parseISO(activeRota.data_inicio)
      const checkDate = startOfDay(settlementDate)
      const start = startOfDay(startDate)

      if (isBefore(checkDate, start)) {
        return
      }

      const { data: item, error: itemError } = await supabase
        .from('ROTA_ITEMS')
        .select('*')
        .eq('rota_id', activeRota.id)
        .eq('cliente_id', clientId)
        .maybeSingle()

      if (itemError) throw itemError
      if (!item) return

      const newX = (item.x_na_rota || 0) - 1

      await supabase
        .from('ROTA_ITEMS')
        .update({ x_na_rota: newX })
        .eq('id', item.id)
    } catch (error) {
      console.error('Error decrementing x_na_rota:', error)
    }
  },
}
