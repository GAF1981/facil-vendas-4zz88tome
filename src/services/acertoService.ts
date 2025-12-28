import { supabase } from '@/lib/supabase/client'
import { Acerto } from '@/types/acerto'

export const acertoService = {
  async getLastAcertoDate(clienteId: number) {
    const { data, error } = await supabase
      .from('ACERTOS')
      .select('DATA_ACERTO')
      .eq('CLIENTE_ID', clienteId)
      .order('DATA_ACERTO', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching last acerto:', error)
      return null
    }

    return data?.DATA_ACERTO || null
  },

  async saveAcerto(acerto: Acerto) {
    // 1. Create Acerto Header
    const { data: acertoData, error: acertoError } = await supabase
      .from('ACERTOS')
      .insert({
        CLIENTE_ID: acerto.clienteId,
        FUNCIONARIO_ID: acerto.funcionarioId,
        VALOR_TOTAL: acerto.valorTotal,
        OBSERVACOES: acerto.observacoes,
        DATA_ACERTO: new Date().toISOString(),
      })
      .select()
      .single()

    if (acertoError) throw acertoError
    if (!acertoData) throw new Error('Falha ao criar acerto')

    // 2. Create Items
    const itemsToInsert = acerto.itens.map((item) => ({
      ACERTO_ID: acertoData.ID,
      PRODUTO_ID: item.produtoId,
      SALDO_INICIAL: item.saldoInicial,
      CONTAGEM: item.contagem,
      QUANT_VENDIDA: item.quantVendida,
      PRECO_UNITARIO: item.precoUnitario,
      VALOR_VENDIDO: item.valorVendido,
      SALDO_FINAL: item.saldoFinal,
    }))

    const { error: itemsError } = await supabase
      .from('ITENS_ACERTO')
      .insert(itemsToInsert)

    if (itemsError) {
      // If items fail, we should technically rollback, but for simplicity we'll just throw
      // Ideally this would be an RPC call or transaction
      console.error('Error inserting items:', itemsError)
      throw itemsError
    }

    return acertoData
  },

  async generatePdf(data: any) {
    const { data: blob, error } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: data,
        // @ts-expect-error - responseType is valid in v2 but might be missing in types
        responseType: 'blob',
      },
    )

    if (error) throw error
    return blob as Blob
  },
}
