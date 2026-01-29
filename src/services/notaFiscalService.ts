import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'

export const notaFiscalService = {
  async getSettlements(
    rotaId?: number | null,
  ): Promise<NotaFiscalSettlement[]> {
    let orderIds: number[] | null = null

    // 1. If rotaId provided, find relevant order IDs from RECEBIMENTOS
    if (rotaId) {
      const { data: recData, error: recError } = await supabase
        .from('RECEBIMENTOS')
        .select('venda_id')
        .eq('rota_id', rotaId)

      if (recError) throw recError

      if (recData && recData.length > 0) {
        orderIds = Array.from(new Set(recData.map((r) => r.venda_id)))
      } else {
        return []
      }
    }

    // 2. Build Query for BANCO_DE_DADOS
    let query = supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", CLIENTE, "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_cadastro, nota_fiscal_venda, solicitacao_nf, nota_fiscal_emitida',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })

    if (orderIds) {
      query = query.in('"NÚMERO DO PEDIDO"', orderIds)
    } else {
      query = query.limit(2000)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) return []

    // 3. Fetch Emitted Notes Info
    const fetchedOrderIds = data.map((d) => d['NÚMERO DO PEDIDO'] || 0)
    const { data: emittedData } = await supabase
      .from('notas_fiscais_emitidas')
      .select('pedido_id, numero_nota_fiscal')
      .in('pedido_id', fetchedOrderIds)

    const emittedMap = new Map<number, string>()
    emittedData?.forEach((e) => {
      emittedMap.set(e.pedido_id, e.numero_nota_fiscal)
    })

    // 4. Fetch Route Info
    const { data: routesData } = await supabase
      .from('RECEBIMENTOS')
      .select('venda_id, rota_id')
      .in('venda_id', fetchedOrderIds)
      .not('rota_id', 'is', null)

    const routeMap = new Map<number, number>()
    routesData?.forEach((r) => {
      if (r.rota_id && !routeMap.has(r.venda_id)) {
        routeMap.set(r.venda_id, r.rota_id)
      }
    })

    return data.map((row) => {
      const nfCadastro = row.nota_fiscal_cadastro
      const nfVenda = row.nota_fiscal_venda
      const solicitacao = row.solicitacao_nf || 'NÃO'
      const dbStatus = row.nota_fiscal_emitida

      // Automated Status Logic
      // Resolvido: If (0, 0, 0) -> All NO/0
      // Pendente: If ANY is SIM
      let calculatedStatus = 'Resolvida'
      if (nfCadastro === 'SIM' || nfVenda === 'SIM' || solicitacao === 'SIM') {
        calculatedStatus = 'Pendente'
      }

      // Preserve 'Emitida' if strictly emitted
      if (dbStatus === 'Emitida') {
        calculatedStatus = 'Emitida'
      }

      return {
        orderId: row['NÚMERO DO PEDIDO'] || 0,
        clientCode: row['CÓDIGO DO CLIENTE'] || 0,
        clientName: row['CLIENTE'] || 'N/D',
        dataAcerto: row['DATA DO ACERTO'] || '',
        valorTotalVendido: parseCurrency(row['VALOR VENDIDO']),
        notaFiscalCadastro: nfCadastro || 'NÃO',
        notaFiscalVenda: nfVenda || 'NÃO',
        solicitacaoNf: solicitacao,
        notaFiscalEmitida: calculatedStatus, // Using the calculated status
        numeroNotaFiscal:
          emittedMap.get(row['NÚMERO DO PEDIDO'] || 0) || undefined,
        rotaId: routeMap.get(row['NÚMERO DO PEDIDO'] || 0) || null,
      }
    })
  },

  async emitInvoice(
    payload: {
      pedidoId: number
      clienteId: number
      numeroNotaFiscal: string
      funcionarioId: number
    },
    updateStatus: boolean = true,
  ) {
    const { error } = await supabase.from('notas_fiscais_emitidas').insert({
      pedido_id: payload.pedidoId,
      cliente_id: payload.clienteId,
      numero_nota_fiscal: payload.numeroNotaFiscal,
      funcionario_id: payload.funcionarioId,
      data_emissao: new Date().toISOString(),
    })

    if (error) throw error

    if (updateStatus) {
      await supabase
        .from('BANCO_DE_DADOS')
        .update({ nota_fiscal_emitida: 'Emitida' } as any)
        .eq('"NÚMERO DO PEDIDO"', payload.pedidoId)
    }
  },

  async updateStatus(orderId: number, status: string) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ nota_fiscal_emitida: status } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },

  async updateSolicitacao(orderId: number, value: 'SIM' | 'NÃO') {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ solicitacao_nf: value } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },
}
