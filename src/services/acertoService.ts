import { supabase } from '@/lib/supabase/client'
import { Acerto } from '@/types/acerto'

export const acertoService = {
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
      console.error('Error inserting items:', itemsError)
      throw itemsError
    }

    return acertoData
  },

  async generatePdf(
    data: any,
    options?: { preview?: boolean; signature?: string | null },
  ) {
    const { data: blob, error } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: {
          ...data,
          preview: options?.preview ?? false,
          signature: options?.signature ?? null,
        },
        // @ts-expect-error - responseType is valid in v2 but might be missing in types
        responseType: 'blob',
      },
    )

    if (error) throw error
    return blob as Blob
  },
}
