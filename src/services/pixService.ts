import { supabase } from '@/lib/supabase/client'
import { PixReceiptRow, PixConferenceFormData } from '@/types/pix'

export const pixService = {
  async getPixReceipts(): Promise<PixReceiptRow[]> {
    // New logic: Fetch from RECEBIMENTOS where forma_pagamento contains 'Pix' (Left Join with PIX)
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        *,
        CLIENTES ( "NOME CLIENTE" ),
        PIX (*)
      `,
      )
      .ilike('forma_pagamento', '%Pix%')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error

    return (data || []).map((row: any) => {
      // row.PIX is the joined object (or null if left join finds no match)
      // Note: Supabase JS client returns single object for one-to-one or one-to-many depending on definition.
      // Assuming PIX table has one record per recebimento_id (unique constraint), it returns an object or null/array.
      // Based on previous types it seemed one-to-one.
      const pix = Array.isArray(row.PIX) ? row.PIX[0] : row.PIX
      const clientName = row.CLIENTES?.['NOME CLIENTE'] || 'N/D'

      return {
        id: row.id, // recebimento.id
        venda_id: row.venda_id,
        id_da_femea: row.ID_da_fêmea || row.venda_id,
        cliente_id: row.cliente_id,
        forma_pagamento: row.forma_pagamento,
        valor_pago: row.valor_pago,
        valor_registrado: row.valor_registrado,
        vencimento: row.vencimento,
        created_at: row.created_at,
        cliente_nome: clientName,
        // Map PIX data if exists
        pix_id: pix?.id,
        nome_no_pix: pix?.nome_no_pix,
        banco_pix: pix?.banco_pix,
        data_pix_realizado: pix?.data_pix_realizado,
        confirmado_por: pix?.confirmado_por,
      }
    })
  },

  async saveConference(
    recebimentoId: number,
    vendaId: number,
    data: PixConferenceFormData,
    employeeName: string,
  ) {
    // Upsert to PIX table
    const { error } = await supabase.from('PIX').upsert(
      {
        recebimento_id: recebimentoId,
        nome_no_pix: data.nome_no_pix,
        banco_pix: data.banco_pix,
        data_pix_realizado: new Date(data.data_pix_realizado).toISOString(),
        confirmado_por: employeeName,
        venda_id: vendaId,
      },
      { onConflict: 'recebimento_id' },
    )

    if (error) throw error
  },
}
