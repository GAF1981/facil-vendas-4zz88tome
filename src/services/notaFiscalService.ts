import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement, EmitInvoicePayload } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'
import { PaymentEntry } from '@/types/payment'

export const notaFiscalService = {
  async getAllSettlements(): Promise<NotaFiscalSettlement[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida, nota_fiscal_cadastro, nota_fiscal_venda, solicitacao_nf, CLIENTE',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(1000)

    if (error) throw error

    // Fetch issued invoices to get numbers
    const { data: issuedData, error: issuedError } = await supabase
      .from('notas_fiscais_emitidas')
      .select('pedido_id, numero_nota_fiscal')

    if (issuedError)
      console.error('Error fetching issued invoices:', issuedError)

    const issuedMap = new Map<number, string>()
    issuedData?.forEach((i) => issuedMap.set(i.pedido_id, i.numero_nota_fiscal))

    return this.processSettlementData(data, '', issuedMap)
  },

  async getSettlementsByClient(
    clientId: number,
    clientNotaFiscalInfo: string,
  ): Promise<NotaFiscalSettlement[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida, nota_fiscal_cadastro, nota_fiscal_venda, solicitacao_nf, CLIENTE',
      )
      .eq('"CÓDIGO DO CLIENTE"', clientId)
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })

    if (error) throw error

    // Fetch issued invoices
    const { data: issuedData } = await supabase
      .from('notas_fiscais_emitidas')
      .select('pedido_id, numero_nota_fiscal')
      .eq('cliente_id', clientId)

    const issuedMap = new Map<number, string>()
    issuedData?.forEach((i) => issuedMap.set(i.pedido_id, i.numero_nota_fiscal))

    return this.processSettlementData(data, clientNotaFiscalInfo, issuedMap)
  },

  processSettlementData(
    data: any[] | null,
    defaultNfInfo: string,
    issuedMap: Map<number, string>,
  ): NotaFiscalSettlement[] {
    if (!data) return []

    const ordersMap = new Map<number, NotaFiscalSettlement>()

    data.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        // Normalize inputs
        const nfCadastro = row.nota_fiscal_cadastro || defaultNfInfo || 'NÃO'
        const nfVenda = row.nota_fiscal_venda || 'NÃO'
        const solicitacao = row.solicitacao_nf || 'NÃO'
        let status = row.nota_fiscal_emitida || 'Pendente'

        // Strict Status Automation Logic (Resolvido vs Pendente)
        // Only override if not already Emitida
        if (status !== 'Emitida') {
          // Helper to check for "SIM"
          const isSim = (val: string | null) => val === 'SIM'

          // Logic: If ANY is SIM, then Pendente. Else Resolvido.
          if (isSim(nfCadastro) || isSim(nfVenda) || isSim(solicitacao)) {
            status = 'Pendente'
          } else {
            status = 'Resolvida'
          }
        }

        ordersMap.set(orderId, {
          orderId: orderId,
          clientCode: row['CÓDIGO DO CLIENTE'],
          clientName: row['CLIENTE'] || 'N/D',
          dataAcerto: row['DATA DO ACERTO'] || '',
          valorTotalVendido: 0,
          notaFiscalCadastro: nfCadastro,
          notaFiscalVenda: nfVenda,
          solicitacaoNf: solicitacao,
          notaFiscalEmitida: status,
          numeroNotaFiscal: issuedMap.get(orderId) || null,
        })
      }

      const order = ordersMap.get(orderId)!
      order.valorTotalVendido += parseCurrency(row['VALOR VENDIDO'])
    })

    return Array.from(ordersMap.values())
  },

  async toggleRequest(orderId: number, currentValue: string) {
    const newValue = currentValue === 'SIM' ? 'NÃO' : 'SIM'
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ solicitacao_nf: newValue } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
    return newValue
  },

  async emitInvoice(payload: EmitInvoicePayload) {
    // 1. Insert into NOTAS FISCAIS EMITIDAS
    const { error: insertError } = await supabase
      .from('notas_fiscais_emitidas')
      .insert({
        pedido_id: payload.pedidoId,
        cliente_id: payload.clienteId,
        numero_nota_fiscal: payload.numeroNotaFiscal,
        funcionario_id: payload.funcionarioId,
      })

    if (insertError) throw insertError

    // 2. Update BANCO_DE_DADOS status
    const { error: updateError } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ nota_fiscal_emitida: 'Emitida' } as any)
      .eq('"NÚMERO DO PEDIDO"', payload.pedidoId)

    if (updateError) throw updateError
  },

  async generateDetailedReport(orderId: number) {
    // Fetch all items for this order from BANCO_DE_DADOS
    const { data: itemsData, error: itemsError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (itemsError) throw itemsError
    if (!itemsData || itemsData.length === 0)
      throw new Error('Pedido não encontrado')

    const first = itemsData[0]

    // Fetch Client Details for Header
    const { data: clientData, error: clientError } = await supabase
      .from('CLIENTES')
      .select('*')
      .eq('CODIGO', first['CÓDIGO DO CLIENTE'])
      .single()

    if (clientError) {
      console.error('Error fetching client details:', clientError)
    }

    // Calculate Financials
    let totalVendido = 0
    itemsData.forEach((item) => {
      totalVendido += parseCurrency(item['VALOR VENDIDO'])
    })

    const discountStr = first['DESCONTO POR GRUPO'] || '0'
    const discountVal = parseCurrency(discountStr.replace('%', ''))
    const discountFactor = discountVal > 1 ? discountVal / 100 : discountVal

    const valorDesconto = totalVendido * discountFactor
    const totalAPagar = totalVendido - valorDesconto

    // Map data to expected format for PDF
    const items = itemsData.map((item) => {
      const saldoInicial = item['SALDO INICIAL'] || 0
      const contagem = item['CONTAGEM'] || 0
      const saldoFinal = item['SALDO FINAL'] || 0
      const diff = saldoFinal - contagem

      let novasConsignacoes = 0
      let recolhido = 0

      if (diff > 0) {
        novasConsignacoes = diff
      } else {
        recolhido = Math.abs(diff)
      }

      return {
        codigo: item['COD. PRODUTO'],
        produtoNome: item['MERCADORIA'] || 'Produto sem nome',
        tipo: item['TIPO'] || '-',
        saldoInicial: saldoInicial,
        contagem: contagem,
        quantVendida: parseCurrency(item['QUANTIDADE VENDIDA']),
        valorVendido: parseCurrency(item['VALOR VENDIDO']),
        saldoFinal: saldoFinal,
        novasConsignacoes: novasConsignacoes,
        recolhido: recolhido,
      }
    })

    // Construct Payload for Edge Function
    const payload = {
      reportType: 'detailed-order-report', // A4 Detailed Report
      format: 'A4',
      client: {
        'NOME CLIENTE': clientData?.['NOME CLIENTE'] || first['CLIENTE'],
        CODIGO: first['CÓDIGO DO CLIENTE'],
        ENDEREÇO: clientData?.['ENDEREÇO'],
        BAIRRO: clientData?.['BAIRRO'],
        MUNICÍPIO: clientData?.['MUNICÍPIO'],
        CNPJ: clientData?.CNPJ,
        CEP: clientData?.['CEP OFICIO'],
        'FONE 1': clientData?.['FONE 1'],
        'CONTATO 1': clientData?.['CONTATO 1'],
      },
      employee: {
        nome_completo: first['FUNCIONÁRIO'] || 'Não identificado',
      },
      items,
      date: first['DATA DO ACERTO'] || new Date().toISOString(),
      orderNumber: orderId,
      totalVendido,
      valorDesconto,
      totalAPagar, // Changed field name to match requirement
    }

    const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: payload,
        responseType: 'blob',
      },
    )

    if (pdfError) throw pdfError
    return pdfBlob as Blob
  },
}
