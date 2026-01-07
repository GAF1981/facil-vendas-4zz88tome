import { supabase } from '@/lib/supabase/client'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
  InventoryMovementType,
  MovementDetail,
  InventoryReportMetrics,
} from '@/types/inventory_general'
import { productsService } from './productsService'
import { parseCurrency } from '@/lib/formatters'

export const inventoryGeneralService = {
  async getSessions(): Promise<InventoryGeneralSession[]> {
    const { data, error } = await supabase
      .from('ID Inventário')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return data as InventoryGeneralSession[]
  },

  async getActiveSession(): Promise<InventoryGeneralSession | null> {
    const { data, error } = await supabase
      .from('ID Inventário')
      .select('*')
      .eq('status', 'ABERTO')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as InventoryGeneralSession | null
  },

  async startNewSession() {
    // 1. Close current open session(s)
    await supabase
      .from('ID Inventário')
      .update({ status: 'FECHADO', data_fim: new Date().toISOString() })
      .eq('status', 'ABERTO')

    // 2. Create new session
    const { data: newSession, error } = await supabase
      .from('ID Inventário')
      .insert({ status: 'ABERTO', data_inicio: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error

    // 3. Data Continuity: Fetch 'novo_saldo_final' from the LAST closed session (ID n)
    // and insert as 'saldo_inicial' for the NEW session (ID n+1).
    const { data: lastSession } = await supabase
      .from('ID Inventário')
      .select('id')
      .eq('status', 'FECHADO')
      .neq('id', newSession.id) // Ensure we don't pick the one we just made if logic fails (though status is different)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSession) {
      const { data: prevBalances } = await supabase
        .from('ESTOQUE GERAL AJUSTES')
        .select('produto_id, novo_saldo_final')
        .eq('id_inventario', lastSession.id)

      if (prevBalances && prevBalances.length > 0) {
        // We need product details to insert into SALDO INICIAL table (denormalized structure)
        // Optimizing: fetch only needed products
        const productIds = prevBalances.map((p) => p.produto_id)

        // Fetch in chunks if too many? Supabase/Postgres handles `in` reasonably well for a few thousands.
        // For strict robustness with >10k items, we should batch. Assuming <10k for now as per productsService logic.
        const { data: products } = await supabase
          .from('PRODUTOS')
          .select('ID, PREÇO, CODIGO, PRODUTO, CÓDIGO BARRAS')
          .in('ID', productIds)

        const productMap = new Map(products?.map((p) => [p.ID, p]))

        const initials = prevBalances
          .map((pb) => {
            const prod = productMap.get(pb.produto_id)
            if (!prod) return null
            return {
              id_inventario: newSession.id,
              produto_id: pb.produto_id,
              saldo_inicial: pb.novo_saldo_final,
              produto: prod.PRODUTO,
              preco: parseCurrency(prod.PREÇO),
              codigo_produto: prod.CODIGO,
              barcode: prod['CÓDIGO BARRAS'],
            }
          })
          .filter(Boolean)

        if (initials.length > 0) {
          // Batch insert
          const batchSize = 1000
          for (let i = 0; i < initials.length; i += batchSize) {
            await supabase
              .from('ESTOQUE GERAL SALDO INICIAL')
              .insert(initials.slice(i, i + batchSize))
          }
        }
      }
    }

    return newSession as InventoryGeneralSession
  },

  async resetInitialBalances(sessionId: number) {
    await supabase
      .from('ESTOQUE GERAL SALDO INICIAL')
      .update({ saldo_inicial: 0 })
      .eq('id_inventario', sessionId)
  },

  async getInventoryData(sessionId: number): Promise<InventoryGeneralItem[]> {
    const { data: products } = await productsService.getProducts(1, 10000)
    if (!products) return []

    const { data: employees } = await supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')
    const employeeMap = new Map(
      employees?.map((e) => [e.id, e.nome_completo]) || [],
    )

    const [
      initial,
      compras,
      carToStock,
      losses,
      stockToCar,
      counts,
      adjustments,
    ] = await Promise.all([
      supabase
        .from('ESTOQUE GERAL SALDO INICIAL')
        .select('produto_id, saldo_inicial')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL COMPRAS')
        .select('produto_id, compras_quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL CARRO PARA ESTOQUE')
        .select('produto_id, quantidade, created_at, funcionario_id')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL SAÍDAS PERDAS')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
        .select('produto_id, quantidade, created_at, funcionario_id')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL CONTAGEM')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL AJUSTES')
        .select('produto_id, ajuste_quantidade, novo_saldo_final')
        .eq('id_inventario', sessionId),
    ])

    // Identify which products have at least one count record
    const countedProductIds = new Set(counts.data?.map((c) => c.produto_id))

    const agg = new Map<number, InventoryGeneralItem>()

    products.forEach((p) => {
      agg.set(p.ID, {
        produto_id: p.ID,
        codigo: p.CODIGO,
        produto: p.PRODUTO || 'Desconhecido',
        tipo: p.TIPO,
        preco: parseCurrency(p.PREÇO),
        saldo_inicial: 0,
        compras: 0,
        carro_para_estoque: 0,
        saidas_perdas: 0,
        estoque_para_carro: 0,
        saldo_final: 0,
        contagem: 0,
        diferenca_qty: 0,
        diferenca_val: 0,
        ajustes: 0,
        novo_saldo_final: 0,
        has_count_record: countedProductIds.has(p.ID),
        details_carro_para_estoque: [],
        details_estoque_para_carro: [],
      })
    })

    const sum = (
      data: any[],
      key: string,
      targetField: keyof InventoryGeneralItem,
    ) => {
      data?.forEach((row) => {
        const item = agg.get(row.produto_id)
        if (item) {
          ;(item[targetField] as number) += Number(row[key] || 0)
        }
      })
    }

    sum(initial.data || [], 'saldo_inicial', 'saldo_inicial')
    sum(compras.data || [], 'compras_quantidade', 'compras')
    // Sum manually for carToStock to handle details
    carToStock.data?.forEach((row) => {
      const item = agg.get(row.produto_id)
      if (item) {
        item.carro_para_estoque += Number(row.quantidade || 0)
        item.details_carro_para_estoque.push({
          date: row.created_at,
          quantity: Number(row.quantidade),
          employeeName:
            employeeMap.get(row.funcionario_id) ||
            (row.funcionario_id ? 'Desconhecido' : 'Não Informado'),
        })
      }
    })

    sum(losses.data || [], 'quantidade', 'saidas_perdas')

    // Sum manually for stockToCar to handle details
    stockToCar.data?.forEach((row) => {
      const item = agg.get(row.produto_id)
      if (item) {
        item.estoque_para_carro += Number(row.quantidade || 0)
        item.details_estoque_para_carro.push({
          date: row.created_at,
          quantity: Number(row.quantidade),
          employeeName:
            employeeMap.get(row.funcionario_id) ||
            (row.funcionario_id ? 'Desconhecido' : 'Não Informado'),
        })
      }
    })

    sum(counts.data || [], 'quantidade', 'contagem')
    sum(adjustments.data || [], 'ajuste_quantidade', 'ajustes')

    return Array.from(agg.values()).map((item) => {
      item.saldo_final =
        item.saldo_inicial +
        item.compras +
        item.carro_para_estoque -
        item.saidas_perdas -
        item.estoque_para_carro

      item.diferenca_qty = item.contagem - item.saldo_final // Fixed logic: Difference = Count - Theoretical
      item.diferenca_val = item.diferenca_qty * item.preco

      const adj = adjustments.data?.find(
        (a) => a.produto_id === item.produto_id,
      )
      if (adj) {
        item.novo_saldo_final = adj.novo_saldo_final
      } else {
        // By default, if no adjustment record (which happens before finalize), new balance = count
        // "Ajustes" column is usually just "Diferença" but stored.
        // Logic: New Balance = Count + Adjustments (if manual adjustments existed).
        // Since we hide Adjustments column, we rely on Count being the source of truth for New Balance.
        item.novo_saldo_final = item.contagem + item.ajustes
      }

      return item
    })
  },

  async registerMovement(
    sessionId: number,
    type: InventoryMovementType,
    items: { productId: number; quantity: number; extra?: any }[],
  ) {
    if (items.length === 0) return

    if (type === 'COMPRA') {
      await supabase.from('ESTOQUE GERAL COMPRAS').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          compras_quantidade: i.quantity,
          fornecedor_id: i.extra?.fornecedorId,
          valor_unitario: i.extra?.valorUnitario,
        })),
      )
    } else if (type === 'CARRO_PARA_ESTOQUE') {
      await supabase.from('ESTOQUE GERAL CARRO PARA ESTOQUE').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
          funcionario_id: i.extra?.funcionarioId,
        })),
      )
    } else if (type === 'PERDA') {
      await supabase.from('ESTOQUE GERAL SAÍDAS PERDAS').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
          motivo: i.extra?.motivo,
        })),
      )
    } else if (type === 'ESTOQUE_PARA_CARRO') {
      await supabase.from('ESTOQUE GERAL ESTOQUE PARA CARRO').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
          funcionario_id: i.extra?.funcionarioId,
        })),
      )
    } else if (type === 'CONTAGEM') {
      await supabase.from('ESTOQUE GERAL CONTAGEM').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
        })),
      )
    }
  },

  async finalizeAdjustments(sessionId: number, items: InventoryGeneralItem[]) {
    const adjustments = items.map((item) => ({
      id_inventario: sessionId,
      produto_id: item.produto_id,
      ajuste_quantidade: 0, // We hide adjustments column, so we assume 0 manual adjustments
      diferenca_quantidade: item.diferenca_qty,
      diferenca_valor: item.diferenca_val,
      novo_saldo_final: item.novo_saldo_final,
    }))

    // Use upsert or insert? Ideally we clear previous adjustments for this session or upsert.
    // Assuming fresh insert for this flow as finalize happens once usually.
    // If re-finalizing, we should delete old ones first.
    await supabase
      .from('ESTOQUE GERAL AJUSTES')
      .delete()
      .eq('id_inventario', sessionId)

    const batchSize = 1000
    for (let i = 0; i < adjustments.length; i += batchSize) {
      const { error } = await supabase
        .from('ESTOQUE GERAL AJUSTES')
        .insert(adjustments.slice(i, i + batchSize))
      if (error) throw error
    }

    await this.startNewSession()
  },

  async getReportMetrics(sessionId: number): Promise<InventoryReportMetrics> {
    const { data: adjustments } = await supabase
      .from('ESTOQUE GERAL AJUSTES')
      .select('diferenca_quantidade, diferenca_valor')
      .eq('id_inventario', sessionId)

    const { data: compras } = await supabase
      .from('ESTOQUE GERAL COMPRAS')
      .select('compras_quantidade, valor_unitario')
      .eq('id_inventario', sessionId)

    const diferencas = adjustments?.reduce(
      (acc, curr) => ({
        quantidade: acc.quantidade + (curr.diferenca_quantidade || 0),
        valor: acc.valor + (curr.diferenca_valor || 0),
      }),
      { quantidade: 0, valor: 0 },
    ) || { quantidade: 0, valor: 0 }

    const comprasMetrics = compras?.reduce(
      (acc, curr) => ({
        total_qty: acc.total_qty + (curr.compras_quantidade || 0),
        total_value:
          acc.total_value +
          (curr.compras_quantidade || 0) * (curr.valor_unitario || 0),
      }),
      { total_qty: 0, total_value: 0 },
    ) || { total_qty: 0, total_value: 0 }

    const preco_medio =
      comprasMetrics.total_qty > 0
        ? comprasMetrics.total_value / comprasMetrics.total_qty
        : 0

    return {
      diferencas,
      compras: {
        total_quantidade: comprasMetrics.total_qty,
        preco_medio,
      },
    }
  },
}
