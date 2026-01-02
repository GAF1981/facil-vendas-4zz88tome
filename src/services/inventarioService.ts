import { supabase } from '@/lib/supabase/client'
import { InventarioItem } from '@/types/inventario'
import { parseCurrency } from '@/lib/formatters'

export const inventarioService = {
  async getInventory(): Promise<InventarioItem[]> {
    // 1. Fetch all Products
    const { data: products, error: prodError } = await supabase
      .from('PRODUTOS')
      .select('*')
      .order('PRODUTO', { ascending: true })

    if (prodError) throw prodError
    if (!products) return []

    // 2. Fetch latest DB state for each product (Aggregation Logic)
    // To do this efficiently without a complex query, we'll fetch recent DB entries.
    // Assuming "Inventário" reflects the latest "Acerto" state.
    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"COD. PRODUTO", "SALDO INICIAL", "SALDO FINAL", "CONTAGEM", "NOVAS CONSIGNAÇÕES", "RECOLHIDO", "QUANTIDADE VENDIDA", "DATA DO ACERTO", "HORA DO ACERTO"',
      )
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(10000) // Fetching a large chunk of recent transactions

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
      // 'ENTRADA (estoque para Carro)' -> NOVAS CONSIGNAÇÕES
      const entradaEstoqueCarro = parseCurrency(dbRow?.['NOVAS CONSIGNAÇÕES'])
      // 'SAÍDA (carro para estoque)' -> RECOLHIDO
      const saidaCarroEstoque = parseCurrency(dbRow?.['RECOLHIDO'])
      // 'SAÍDA (carro para cliente)' -> QUANTIDADE VENDIDA
      const saidaCarroCliente = parseCurrency(dbRow?.['QUANTIDADE VENDIDA'])
      // 'ENTRADA (cliente para o Carro)' -> Not standard, usually calculated from returns or zero.
      // Assuming 0 for now as it's not a standard column in the provided context
      const entradaClienteCarro = 0

      // Calculated Difference
      // Diff Qty = Contagem - Saldo Final (Logical check)
      // Or Diff Qty = (Inicial + Entradas - Saidas) - Contagem?
      // Usually "Diferença de Estoque" means what is missing.
      // If Saldo Final is calculated by system and Contagem is physical.
      // If system says 10 (Saldo Final) and Contagem says 8, diff is -2.
      // However, usually in 'Acerto', Saldo Final is set to Contagem or derived.
      // Let's use: Saldo Final - Contagem.
      // If Saldo Final matches Contagem (as per logic in AcertoPage), diff is 0.
      // Let's assume standard inventory logic: Expected vs Actual.
      // Expected = Saldo Inicial + Entrada - Saida.
      // If Expected != Contagem, then diff.
      // In this DB, Saldo Final IS the result of the operation.
      // So Diff = Saldo Final - Contagem (should be 0 if perfectly balanced).
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
}
