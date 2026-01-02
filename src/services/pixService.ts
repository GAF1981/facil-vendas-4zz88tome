import { supabase } from '@/lib/supabase/client'
import { PixAcertoRow, PixRecebimentoRow } from '@/types/pix'
import { parseCurrency } from '@/lib/formatters'

export const pixService = {
  async getPixAcertos(): Promise<PixAcertoRow[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "FUNCIONÁRIO", "VALOR VENDIDO", "FORMA", "pix_acerto_confirmado", "pix_confirmado_por"',
      )
      .ilike('FORMA', '%Pix%')
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(5000)

    if (error) throw error

    const ordersMap = new Map<number, PixAcertoRow>()

    data?.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        // Parse value from row. Note that typically BANCO_DE_DADOS has multiple rows per order
        // This logic mimics aggregating order total or taking it from one row if duplicated.
        // Assuming line items: sum VALOR VENDIDO for the order
        ordersMap.set(orderId, {
          orderId,
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          employeeName: row['FUNCIONÁRIO'] || 'N/D',
          confirmedBy: row['pix_confirmado_por'],
          value: 0,
          isConfirmed: !!row['pix_acerto_confirmado'],
        })
      }

      const order = ordersMap.get(orderId)!
      order.value += parseCurrency(row['VALOR VENDIDO'])
    })

    return Array.from(ordersMap.values())
  },

  async getPixRecebimentos(): Promise<PixRecebimentoRow[]> {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        'id, venda_id, cliente_id, forma_pagamento, valor_pago, pix_recebimento_confirmado, pix_confirmado_por',
      )
      .eq('forma_pagamento', 'Pix')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      orderId: row.venda_id,
      clientCode: row.cliente_id,
      paymentMethod: row.forma_pagamento,
      value: row.valor_pago,
      isConfirmed: !!row.pix_recebimento_confirmado,
      confirmedBy: row.pix_confirmado_por,
    }))
  },

  async toggleAcertoPix(
    orderId: number,
    confirmed: boolean,
    employeeName: string,
  ) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({
        pix_acerto_confirmado: confirmed,
        pix_confirmado_por: confirmed ? employeeName : null,
      } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },

  async toggleRecebimentoPix(
    id: number,
    confirmed: boolean,
    employeeName: string,
  ) {
    const { error } = await supabase
      .from('RECEBIMENTOS')
      .update({
        pix_recebimento_confirmado: confirmed,
        pix_confirmado_por: confirmed ? employeeName : null,
      } as any)
      .eq('id', id)

    if (error) throw error
  },
}
