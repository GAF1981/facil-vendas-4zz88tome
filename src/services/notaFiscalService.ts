import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'

export const notaFiscalService = {
  async getSettlementsByClient(
    clientId: number,
    clientNotaFiscalInfo: string,
  ): Promise<NotaFiscalSettlement[]> {
    // Fetch all items for the client to aggregate locally
    // We need to fetch 'nota_fiscal_emitida' explicitly.
    // Since types might not be generated yet, we cast or assume it comes in the select *
    // or select explicitly.
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida',
      )
      .eq('"CÓDIGO DO CLIENTE"', clientId)
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })

    if (error) throw error

    if (!data) return []

    // Aggregate by Order ID
    const ordersMap = new Map<number, NotaFiscalSettlement>()

    data.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId: orderId,
          dataAcerto: row['DATA DO ACERTO'] || '',
          valorTotalVendido: 0,
          notaFiscalCadastro: clientNotaFiscalInfo || '',
          notaFiscalVenda: '', // Placeholder
          notaFiscalEmitida: row.nota_fiscal_emitida || false,
        })
      }

      const order = ordersMap.get(orderId)!
      // Accumulate value
      order.valorTotalVendido += parseCurrency(row['VALOR VENDIDO'])
    })

    return Array.from(ordersMap.values())
  },

  async updateIssuanceStatus(orderId: number, status: boolean) {
    // Update all rows for this order since it's a line-item table but the status is per order
    // Using quotes for "NÚMERO DO PEDIDO" due to spaces in column name
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ nota_fiscal_emitida: status } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },
}
