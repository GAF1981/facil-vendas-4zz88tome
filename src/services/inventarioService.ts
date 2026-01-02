import { supabase } from '@/lib/supabase/client'
import { InventarioItem, InventorySession } from '@/types/inventario'
import { parseCurrency } from '@/lib/formatters'

export const inventarioService = {
  async getInventory(funcionarioId?: number): Promise<InventarioItem[]> {
    // 1. Fetch all Products
    const { data: products, error: prodError } = await supabase
      .from('PRODUTOS')
      .select('*')
      .order('PRODUTO', { ascending: true })

    if (prodError) throw prodError
    if (!products) return []

    // 2. Fetch latest DB state for each product (Aggregation Logic)
    let query = supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"COD. PRODUTO", "SALDO INICIAL", "SALDO FINAL", "CONTAGEM", "NOVAS CONSIGNAÇÕES", "RECOLHIDO", "QUANTIDADE VENDIDA", "DATA DO ACERTO", "HORA DO ACERTO", "CODIGO FUNCIONARIO"',
      )

    // If fetching for a specific employee, filter DB records
    if (funcionarioId) {
      query = query.eq('CODIGO FUNCIONARIO', funcionarioId)
    }

    const { data: dbData, error: dbError } = await query
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(10000)

    if (dbError) throw dbError

    // Map DB data by Product Code
    const dbMap = new Map<number, any>()
    dbData?.forEach((row: any) => {
      const codProd = row['COD. PRODUTO']
      if (codProd && !dbMap.has(codProd)) {
        // Since it's sorted by Date DESC, the first occurrence is the latest
        dbMap.set(codProd, row)
      }
    })

    // 3. Map Products to Inventory Items
    const inventory: InventarioItem[] = products.map((prod) => {
      const dbRow = prod.CODIGO ? dbMap.get(prod.CODIGO) : null
      const price = parseCurrency(prod.PREÇO)

      const saldoInicial = dbRow?.['SALDO INICIAL'] || 0
      const saldoFinal = dbRow?.['SALDO FINAL'] || 0
      const contagem = dbRow?.['CONTAGEM'] || 0

      // Map Movements
      const entradaEstoqueCarro = parseCurrency(dbRow?.['NOVAS CONSIGNAÇÕES'])
      const saidaCarroEstoque = parseCurrency(dbRow?.['RECOLHIDO'])
      const saidaCarroCliente = parseCurrency(dbRow?.['QUANTIDADE VENDIDA'])
      const entradaClienteCarro = 0

      // Calculated Difference
      const diffQty = saldoFinal - contagem
      const diffVal = diffQty * price

      return {
        id: prod.ID,
        codigo_barras: prod['CÓDIGO BARRAS']
          ? prod['CÓDIGO BARRAS'].toString()
          : null,
        codigo_produto: prod.CODIGO,
        mercadoria: prod.PRODUTO || 'N/D',
        tipo: prod.TIPO,
        preco: price,
        saldo_inicial: saldoInicial,
        entrada_estoque_carro: entradaEstoqueCarro,
        entrada_cliente_carro: entradaClienteCarro,
        saida_carro_estoque: saidaCarroEstoque,
        saida_carro_cliente: saidaCarroCliente,
        saldo_final: saldoFinal,
        estoque_contagem_carro: contagem,
        diferenca_quantidade: diffQty,
        diferenca_valor: diffVal,
      }
    })

    return inventory
  },

  async getActiveSession(): Promise<InventorySession | null> {
    const { data, error } = await supabase
      .from('sessoes_inventario')
      .select('*')
      .eq('status', 'ABERTO')
      .maybeSingle()

    if (error) throw error
    return data as InventorySession | null
  },

  async startSession(
    tipo: 'GERAL' | 'FUNCIONARIO',
    funcionarioId?: number,
  ): Promise<InventorySession> {
    const { data, error } = await supabase
      .from('sessoes_inventario')
      .insert({
        tipo,
        funcionario_id: funcionarioId,
        status: 'ABERTO',
      })
      .select()
      .single()

    if (error) throw error
    return data as InventorySession
  },

  async closeSession(id: number): Promise<InventorySession> {
    const { data, error } = await supabase
      .from('sessoes_inventario')
      .update({
        status: 'FECHADO',
        data_fim: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as InventorySession
  },
}
