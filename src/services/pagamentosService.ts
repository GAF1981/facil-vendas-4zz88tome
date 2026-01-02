import { supabase } from '@/lib/supabase/client'
import { PagamentoRow } from '@/types/pagamentos'

export const pagamentosService = {
  async getPixPayments(): Promise<PagamentoRow[]> {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        id,
        venda_id,
        ID_da_fêmea,
        cliente_id,
        forma_pagamento,
        valor_pago,
        vencimento,
        created_at,
        CLIENTES (
          "NOME CLIENTE"
        )
      `,
      )
      .eq('forma_pagamento', 'Pix')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      venda_id: row.venda_id,
      id_da_femea: row['ID_da_fêmea'],
      cliente_id: row.cliente_id,
      cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'N/D',
      forma_pagamento: row.forma_pagamento,
      valor: row.valor_pago,
      data: row.vencimento || row.created_at,
    }))
  },
}
