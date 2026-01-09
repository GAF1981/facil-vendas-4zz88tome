import { supabase } from '@/lib/supabase/client'
import {
  EstoqueCarroItem,
  EstoqueCarroSession,
  EstoqueCarroMovementInsert,
} from '@/types/estoque_carro'
import { productsService } from './productsService'
import { parseCurrency } from '@/lib/formatters'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'

export const estoqueCarroService = {
  async getActiveSession(funcionarioId: number) {
    const { data, error } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .is('data_fim', null)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as EstoqueCarroSession | null
  },

  async getLastSession(funcionarioId: number) {
    const { data, error } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .not('data_fim', 'is', null)
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as EstoqueCarroSession | null
  },

  async startSession(funcionarioId: number) {
    // 1. Get last session to copy final balance
    const lastSession = await this.getLastSession(funcionarioId)

    // 2. Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from('ID ESTOQUE CARRO')
      .insert({
        funcionario_id: funcionarioId,
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    // 3. Populate Initial Balance
    // If previous session exists, use its final balance. Otherwise 0.
    const { data: products } = await productsService.getProducts(1, 10000)
    const productsList = products || []

    let previousBalances = new Map<number, number>()
    if (lastSession) {
      const { data: prevData } = await supabase
        .from('ESTOQUE CARRO SALDO FINAL')
        .select('produto_id, saldo_final')
        .eq('id_estoque_carro', lastSession.id)

      prevData?.forEach((p) =>
        previousBalances.set(p.produto_id, p.saldo_final),
      )
    }

    const initBalances = productsList.map((p) => ({
      id_estoque_carro: newSession.id,
      produto_id: p.ID,
      codigo_produto: p.CODIGO,
      produto: p.PRODUTO,
      preco: parseCurrency(p.PREÇO),
      saldo_inicial: previousBalances.get(p.ID) || 0,
      funcionario_id: funcionarioId,
    }))

    if (initBalances.length > 0) {
      const { error: initError } = await supabase
        .from('ESTOQUE CARRO SALDO INICIAL')
        .insert(initBalances)
      if (initError) throw initError
    }

    return newSession
  },

  async getSessionData(
    session: EstoqueCarroSession,
  ): Promise<EstoqueCarroItem[]> {
    const sessionId = session.id
    const funcionarioId = session.funcionario_id
    const startDate = session.data_inicio
    const endDate = session.data_fim || new Date().toISOString()

    // 1. Fetch Products
    const { data: products } = await productsService.getProducts(1, 10000)
    if (!products) return []

    // 2. Fetch Initial Balances
    const { data: initialBalances } = await supabase
      .from('ESTOQUE CARRO SALDO INICIAL')
      .select('produto_id, saldo_inicial')
      .eq('id_estoque_carro', sessionId)

    const initialMap = new Map<number, number>()
    initialBalances?.forEach((i) =>
      initialMap.set(i.produto_id, i.saldo_inicial),
    )

    // 3. Fetch Movements from the DETAIL TABLES now (as they are the source of truth for the session)
    // Client -> Car (RECOLHIDO) -> 'ESTOQUE CARRO: CLIENTE PARA O CARRO'
    const { data: clientToCarData } = await supabase
      .from('ESTOQUE CARRO: CLIENTE PARA O CARRO')
      .select('produto_id, ENTRADAS_cliente_carro')
      .eq('id_estoque_carro', sessionId)

    const clientToCarMap = new Map<number, number>()
    clientToCarData?.forEach((row) => {
      if (row.produto_id)
        clientToCarMap.set(
          row.produto_id,
          (clientToCarMap.get(row.produto_id) || 0) +
            (row.ENTRADAS_cliente_carro || 0),
        )
    })

    // Car -> Client (NOVAS CONSIGNAÇÕES) -> 'ESTOQUE CARRO: CARRO PARA O CLIENTE'
    const { data: carToClientData } = await supabase
      .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
      .select('produto_id, SAIDAS_carro_cliente')
      .eq('id_estoque_carro', sessionId)

    const carToClientMap = new Map<number, number>()
    carToClientData?.forEach((row) => {
      if (row.produto_id)
        carToClientMap.set(
          row.produto_id,
          (carToClientMap.get(row.produto_id) || 0) +
            (row.SAIDAS_carro_cliente || 0),
        )
    })

    // Stock -> Car -> 'ESTOQUE CARRO: ESTOQUE PARA O CARRO'
    const { data: stockToCarData } = await supabase
      .from('ESTOQUE CARRO: ESTOQUE PARA O CARRO')
      .select('produto_id, ENTRADAS_estoque_carro')
      .eq('id_estoque_carro', sessionId)

    const stockToCarMap = new Map<number, number>()
    stockToCarData?.forEach((row) => {
      if (row.produto_id)
        stockToCarMap.set(
          row.produto_id,
          (stockToCarMap.get(row.produto_id) || 0) +
            (row.ENTRADAS_estoque_carro || 0),
        )
    })

    // Car -> Stock -> 'ESTOQUE CARRO: CARRO PARA O ESTOQUE'
    const { data: carToStockData } = await supabase
      .from('ESTOQUE CARRO: CARRO PARA O ESTOQUE')
      .select('produto_id, SAIDAS_carro_estoque')
      .eq('id_estoque_carro', sessionId)

    const carToStockMap = new Map<number, number>()
    carToStockData?.forEach((row) => {
      if (row.produto_id)
        carToStockMap.set(
          row.produto_id,
          (carToStockMap.get(row.produto_id) || 0) +
            (row.SAIDAS_carro_estoque || 0),
        )
    })

    // 4. Fetch Counts and Adjustments
    const { data: counts } = await supabase
      .from('ESTOQUE CARRO CONTAGEM')
      .select('produto_id, quantidade')
      .eq('id_estoque_carro', sessionId)

    const countMap = new Map<number, number>()
    counts?.forEach((c) => countMap.set(c.produto_id, c.quantidade))

    const { data: adjustments } = await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .select('produto_id, ajuste_manual')
      .eq('id_estoque_carro', sessionId)

    const adjustmentMap = new Map<number, number>()
    adjustments?.forEach((a) =>
      adjustmentMap.set(a.produto_id, a.ajuste_manual),
    )

    // Build Result
    return products.map((p) => {
      const initial = initialMap.get(p.ID) || 0
      const inClient = clientToCarMap.get(p.ID) || 0
      const inStock = stockToCarMap.get(p.ID) || 0
      const outClient = carToClientMap.get(p.ID) || 0
      const outStock = carToStockMap.get(p.ID) || 0

      const saldoFinal = initial + inClient + inStock - outClient - outStock
      const contagem = countMap.get(p.ID) || 0

      const diffQtdCrit = saldoFinal - contagem
      const diffVal = diffQtdCrit * parseCurrency(p.PREÇO)

      const ajuste = adjustmentMap.get(p.ID) || 0
      const novoSaldo = contagem + ajuste

      return {
        produto_id: p.ID,
        codigo: p.CODIGO,
        produto: p.PRODUTO || 'Desconhecido',
        tipo: p.TIPO,
        preco: parseCurrency(p.PREÇO),
        saldo_inicial: initial,
        entradas_cliente: inClient,
        entradas_estoque: inStock,
        saidas_cliente: outClient,
        saidas_estoque: outStock,
        saldo_final: saldoFinal,
        contagem: contagem,
        diferenca_qtd: diffQtdCrit,
        diferenca_val: diffVal,
        ajustes: ajuste,
        novo_saldo: novoSaldo,
      }
    })
  },

  async updateStockMovements(sessionId: number, employeeId: number) {
    const session = await this.getActiveSession(employeeId)
    if (!session || session.id !== sessionId) {
      throw new Error('Invalid or closed session.')
    }

    const startDate = parseISO(session.data_inicio)
    // If open, end date is effectively "now" for filtering logic
    const endDate = session.data_fim ? parseISO(session.data_fim) : new Date()

    // 0. Fetch Employee Name
    const { data: employeeData } = await supabase
      .from('FUNCIONARIOS')
      .select('nome_completo')
      .eq('id', employeeId)
      .single()
    const employeeName = employeeData?.nome_completo || 'Unknown'

    // 1. Clear existing data for this session in the 4 tables
    await Promise.all([
      supabase
        .from('ESTOQUE CARRO: CLIENTE PARA O CARRO')
        .delete()
        .eq('id_estoque_carro', sessionId),
      supabase
        .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
        .delete()
        .eq('id_estoque_carro', sessionId),
      supabase
        .from('ESTOQUE CARRO: ESTOQUE PARA O CARRO')
        .delete()
        .eq('id_estoque_carro', sessionId),
      supabase
        .from('ESTOQUE CARRO: CARRO PARA O ESTOQUE')
        .delete()
        .eq('id_estoque_carro', sessionId),
    ])

    // 2. Fetch all products to map codes and details
    const { data: products } = await productsService.getProducts(1, 10000)
    const productsMap = new Map(products?.map((p) => [p.ID, p]) || [])
    const codeToProductMap = new Map(
      products?.map((p) => [p.CODIGO, p]).filter((e) => e[0]) || [],
    )

    // Helper to create insert payload
    const createPayload = (
      prodId: number | null,
      qty: number,
      extra: any = {},
    ) => {
      const prod =
        (prodId ? productsMap.get(prodId) : null) ||
        (extra.code ? codeToProductMap.get(extra.code) : null)
      return {
        id_estoque_carro: sessionId,
        produto_id: prod?.ID ?? prodId, // Fallback if not found
        quantidade: qty, // Original column
        pedido: extra.pedido,
        data_horario: extra.data_horario,
        funcionario: employeeName,
        codigo_produto: prod?.CODIGO ?? null,
        barcode: prod?.['CÓDIGO BARRAS'] ? String(prod['CÓDIGO BARRAS']) : null,
        produto: prod?.PRODUTO ?? 'Desconhecido',
        preco: prod?.PREÇO ? parseCurrency(prod.PREÇO) : 0,
        // Specific columns
        ENTRADAS_cliente_carro: extra.ENTRADAS_cliente_carro,
        SAIDAS_carro_cliente: extra.SAIDAS_carro_cliente,
        ENTRADAS_estoque_carro: extra.ENTRADAS_estoque_carro,
        SAIDAS_carro_estoque: extra.SAIDAS_carro_estoque,
      } as EstoqueCarroMovementInsert
    }

    // 3. Process BANCO_DE_DADOS (Client <-> Car)
    // Fetch records for employee within timeframe
    // We use a broader date string filter then precise date check in JS
    const dateStartStr = session.data_inicio.split('T')[0]
    const dateEndStr = session.data_fim
      ? session.data_fim.split('T')[0]
      : new Date().toISOString().split('T')[0]

    const { data: bdData } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('CODIGO FUNCIONARIO', employeeId)
      .gte('"DATA DO ACERTO"', dateStartStr)
      .lte('"DATA DO ACERTO"', dateEndStr)

    const clientToCarInserts: any[] = []
    const carToClientInserts: any[] = []

    bdData?.forEach((row: any) => {
      const dateStr = row['DATA DO ACERTO']
      const timeStr = row['HORA DO ACERTO'] || '00:00:00'
      if (!dateStr) return
      const rowDate = parseISO(`${dateStr}T${timeStr}`)

      // Check if within session window
      if (isBefore(rowDate, startDate)) return
      if (session.data_fim && isAfter(rowDate, endDate)) return

      const recolhido = parseCurrency(row['RECOLHIDO'])
      const novas = parseCurrency(row['NOVAS CONSIGNAÇÕES'])
      const prodCode = row['COD. PRODUTO']
      const orderId = row['NÚMERO DO PEDIDO']

      if (recolhido > 0) {
        clientToCarInserts.push(
          createPayload(null, recolhido, {
            code: prodCode,
            pedido: orderId,
            data_horario: rowDate.toISOString(),
            ENTRADAS_cliente_carro: recolhido,
          }),
        )
      }

      if (novas > 0) {
        carToClientInserts.push(
          createPayload(null, novas, {
            code: prodCode,
            pedido: orderId,
            data_horario: rowDate.toISOString(),
            SAIDAS_carro_cliente: novas,
          }),
        )
      }
    })

    // 4. Process ESTOQUE GERAL (Stock <-> Car)
    // ESTOQUE GERAL ESTOQUE PARA CARRO (Stock -> Car)
    const { data: stockToCarRows } = await supabase
      .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
      .select('*')
      .eq('funcionario_id', employeeId)
      .gte('created_at', session.data_inicio)

    const stockToCarInserts: any[] = []
    stockToCarRows?.forEach((row) => {
      const rowDate = parseISO(row.created_at || '')
      if (isBefore(rowDate, startDate)) return
      if (session.data_fim && isAfter(rowDate, endDate)) return

      const qty = row.quantidade || 0
      if (qty > 0) {
        stockToCarInserts.push(
          createPayload(row.produto_id, qty, {
            data_horario: row.created_at,
            ENTRADAS_estoque_carro: qty,
          }),
        )
      }
    })

    // ESTOQUE GERAL CARRO PARA ESTOQUE (Car -> Stock)
    const { data: carToStockRows } = await supabase
      .from('ESTOQUE GERAL CARRO PARA ESTOQUE')
      .select('*')
      .eq('funcionario_id', employeeId)
      .gte('created_at', session.data_inicio)

    const carToStockInserts: any[] = []
    carToStockRows?.forEach((row) => {
      const rowDate = parseISO(row.created_at || '')
      if (isBefore(rowDate, startDate)) return
      if (session.data_fim && isAfter(rowDate, endDate)) return

      const qty = row.quantidade || 0
      if (qty > 0) {
        carToStockInserts.push(
          createPayload(row.produto_id, qty, {
            data_horario: row.created_at,
            SAIDAS_carro_estoque: qty,
          }),
        )
      }
    })

    // 5. Insert Data
    // Using simple loops for bulk inserts to handle potential large arrays
    const insertBatch = async (table: string, items: any[]) => {
      if (items.length === 0) return
      const batchSize = 1000
      for (let i = 0; i < items.length; i += batchSize) {
        const { error } = await supabase
          .from(table)
          .insert(items.slice(i, i + batchSize))
        if (error) throw error
      }
    }

    await Promise.all([
      insertBatch('ESTOQUE CARRO: CLIENTE PARA O CARRO', clientToCarInserts),
      insertBatch('ESTOQUE CARRO: CARRO PARA O CLIENTE', carToClientInserts),
      insertBatch('ESTOQUE CARRO: ESTOQUE PARA O CARRO', stockToCarInserts),
      insertBatch('ESTOQUE CARRO: CARRO PARA O ESTOQUE', carToStockInserts),
    ])
  },

  async resetInitialBalance(sessionId: number) {
    const { error } = await supabase
      .from('ESTOQUE CARRO SALDO INICIAL')
      .update({ saldo_inicial: 0 })
      .eq('id_estoque_carro', sessionId)

    if (error) throw error
  },

  async saveCount(sessionId: number, productId: number, quantity: number) {
    // Upsert count
    const { error } = await supabase.from('ESTOQUE CARRO CONTAGEM').upsert(
      {
        id_estoque_carro: sessionId,
        produto_id: productId,
        quantidade: quantity,
      },
      { onConflict: 'id_estoque_carro, produto_id' },
    ) // Assuming unique constraint or logic allows upsert

    // If constraint missing, delete then insert
    if (error) {
      await supabase
        .from('ESTOQUE CARRO CONTAGEM')
        .delete()
        .eq('id_estoque_carro', sessionId)
        .eq('produto_id', productId)
      await supabase.from('ESTOQUE CARRO CONTAGEM').insert({
        id_estoque_carro: sessionId,
        produto_id: productId,
        quantidade: quantity,
      })
    }
  },

  async saveAdjustment(sessionId: number, productId: number, ajuste: number) {
    // Simplified logic, similar to count
    await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .delete()
      .eq('id_estoque_carro', sessionId)
      .eq('produto_id', productId)
    await supabase.from('ESTOQUE CARRO AJUSTES').insert({
      id_estoque_carro: sessionId,
      produto_id: productId,
      ajuste_manual: ajuste,
    })
  },

  async finishSession(session: EstoqueCarroSession, items: EstoqueCarroItem[]) {
    // 1. Save Final Balances
    const finalBalances = items.map((item) => ({
      id_estoque_carro: session.id,
      produto_id: item.produto_id,
      saldo_final: item.novo_saldo, // Is "Novo Saldo" the final one for history? Yes.
      funcionario_id: session.funcionario_id,
      codigo_produto: item.codigo,
      produto: item.produto,
      preco: item.preco,
    }))

    await supabase
      .from('ESTOQUE CARRO SALDO FINAL')
      .delete()
      .eq('id_estoque_carro', session.id)
    await supabase.from('ESTOQUE CARRO SALDO FINAL').insert(finalBalances)

    // 2. Save Differences / Adjustments Snapshot
    const adjustments = items.map((item) => ({
      id_estoque_carro: session.id,
      produto_id: item.produto_id,
      diferenca_quantidade: item.diferenca_qtd,
      diferenca_valor: item.diferenca_val,
      ajuste_manual: item.ajustes,
      novo_saldo: item.novo_saldo,
    }))

    await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .delete()
      .eq('id_estoque_carro', session.id)
    await supabase.from('ESTOQUE CARRO AJUSTES').insert(adjustments)

    // 3. Close Session
    await supabase
      .from('ID ESTOQUE CARRO')
      .update({ data_fim: new Date().toISOString() })
      .eq('id', session.id)

    // 4. Start New Session immediately
    await this.startSession(session.funcionario_id)
  },
}
