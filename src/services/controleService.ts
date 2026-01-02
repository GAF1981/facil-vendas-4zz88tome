import { supabase } from '@/lib/supabase/client'

export interface ControleReceipt {
  id: number
  ID_da_femea: number | null
  cliente_id: number
  forma_pagamento: string
  valor_pago: number
  created_at: string | null
  cliente_nome?: string
}

export const controleService = {
  async getReceipts(): Promise<ControleReceipt[]> {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        id,
        ID_da_fêmea,
        cliente_id,
        forma_pagamento,
        valor_pago,
        created_at,
        CLIENTES (
          "NOME CLIENTE"
        )
      `,
      )
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      ID_da_femea: row['ID_da_fêmea'],
      cliente_id: row.cliente_id,
      forma_pagamento: row.forma_pagamento,
      valor_pago: row.valor_pago,
      created_at: row.created_at,
      cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'N/D',
    }))
  },
}
