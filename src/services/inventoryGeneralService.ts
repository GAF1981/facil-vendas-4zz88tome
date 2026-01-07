import { supabase } from '@/lib/supabase/client'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
  InventoryMovementType,
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

    // 3. Data Continuity: Fetch 'novo_saldo_final' from the LAST closed session
    const { data: lastSession } = await supabase
      .from('ID Inventário')
      .select('id')
      .eq('status', 'FECHADO')
      .neq('id', newSession.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSession) {
      const { data: prevBalances } = await supabase
        .from('ESTOQUE GERAL AJUSTES')
        .select('produto_id, novo_saldo_final')
        .eq('id_inventario', lastSession.id)

      if (prevBalances && prevBalances.length > 0) {
        const productIds = prevBalances.map((p) => p.produto_id)

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
        is_mandatory: false,
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

      // Mandatory Logic: Balance > 0 OR Any Movement > 0
      item.is_mandatory =
        item.saldo_final > 0 ||
        item.compras > 0 ||
        item.carro_para_estoque > 0 ||
        item.saidas_perdas > 0 ||
        item.estoque_para_carro > 0

      item.diferenca_qty = item.contagem - item.saldo_final
      item.diferenca_val = item.diferenca_qty * item.preco

      const adj = adjustments.data?.find(
        (a) => a.produto_id === item.produto_id,
      )
      if (adj) {
        item.novo_saldo_final = adj.novo_saldo_final
      } else {
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

  async updateItemQuantity(
    sessionId: number,
    productId: number,
    type:
      | 'COMPRA'
      | 'CARRO_PARA_ESTOQUE'
      | 'PERDA'
      | 'ESTOQUE_PARA_CARRO'
      | 'CONTAGEM',
    newQuantity: number,
  ) {
    let table = ''
    let qtyField = ''

    switch (type) {
      case 'COMPRA':
        table = 'ESTOQUE GERAL COMPRAS'
        qtyField = 'compras_quantidade'
        break
      case 'CARRO_PARA_ESTOQUE':
        table = 'ESTOQUE GERAL CARRO PARA ESTOQUE'
        qtyField = 'quantidade'
        break
      case 'PERDA':
        table = 'ESTOQUE GERAL SAÍDAS PERDAS'
        qtyField = 'quantidade'
        break
      case 'ESTOQUE_PARA_CARRO':
        table = 'ESTOQUE GERAL ESTOQUE PARA CARRO'
        qtyField = 'quantidade'
        break
      case 'CONTAGEM':
        table = 'ESTOQUE GERAL CONTAGEM'
        qtyField = 'quantidade'
        break
    }

    // 1. Fetch one existing record to preserve metadata (like supplier, employee, reason)
    const { data: existing } = await supabase
      .from(table)
      .select('*')
      .eq('id_inventario', sessionId)
      .eq('produto_id', productId)
      .limit(1)
      .maybeSingle()

    // 2. Delete all records for this product/session/type to strictly enforce the new total
    await supabase
      .from(table)
      .delete()
      .eq('id_inventario', sessionId)
      .eq('produto_id', productId)

    // 3. Insert new record if quantity > 0 or if it's a Count (which can be 0)
    // If quantity is 0 and it is NOT a count, we effectively leave it deleted (reset to 0)
    if (newQuantity > 0 || type === 'CONTAGEM') {
      const insertData: any = {
        id_inventario: sessionId,
        produto_id: productId,
        [qtyField]: newQuantity,
      }

      // Preserve metadata from the last record if available
      if (existing) {
        if ('fornecedor_id' in existing)
          insertData.fornecedor_id = existing.fornecedor_id
        if ('funcionario_id' in existing)
          insertData.funcionario_id = existing.funcionario_id
        if ('motivo' in existing) insertData.motivo = existing.motivo
        if ('valor_unitario' in existing)
          insertData.valor_unitario = existing.valor_unitario
      }

      await supabase.from(table).insert(insertData)
    }
  },

  async finalizeAdjustments(sessionId: number, items: InventoryGeneralItem[]) {
    const adjustments = items.map((item) => ({
      id_inventario: sessionId,
      produto_id: item.produto_id,
      ajuste_quantidade: 0,
      diferenca_quantidade: item.diferenca_qty,
      diferenca_valor: item.diferenca_val,
      novo_saldo_final: item.novo_saldo_final,
    }))

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
