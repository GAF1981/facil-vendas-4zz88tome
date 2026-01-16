import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement, EmitInvoicePayload } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'

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

    // --- NEW: Fetch Product Types Fallback ---
    // Extract unique product codes (exclude nulls)
    const productCodes = Array.from(
      new Set(
        itemsData
          .map((item) => item['COD. PRODUTO'])
          .filter((code) => code !== null && code !== undefined),
      ),
    ) as number[]

    // Fetch TIPO from PRODUTOS table for these codes
    const productTypeMap = new Map<number, string>()
    if (productCodes.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('PRODUTOS')
        .select('CODIGO, TIPO')
        .in('CODIGO', productCodes)

      if (productsError) {
        console.error('Error fetching product types:', productsError)
      } else if (productsData) {
        productsData.forEach((p) => {
          if (p.CODIGO !== null) {
            productTypeMap.set(p.CODIGO, p.TIPO || '')
          }
        })
      }
    }
    // -----------------------------------------

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

    const header = {
      orderId: first['NÚMERO DO PEDIDO'],
      cliente: first['CLIENTE'],
      codigoCliente: first['CÓDIGO DO CLIENTE'],
      funcionario: first['FUNCIONÁRIO'],
      dataAcerto: first['DATA DO ACERTO'],
      // Extra info
      cnpj: clientData?.CNPJ || '',
      endereco: clientData?.['ENDEREÇO'] || '',
      municipio: clientData?.['MUNICÍPIO'] || '',
      cep: clientData?.['CEP OFICIO'] || '',
      contato: clientData?.['CONTATO 1'] || '',
      telefone: clientData?.['FONE 1'] || '',
    }

    const financials = {
      totalVendido,
      valorDesconto,
      totalAPagar,
    }

    // Map data to expected format for PDF
    const items = itemsData.map((item) => {
      let tipo = item['TIPO']
      // Fallback logic for TIPO
      if (!tipo || tipo.trim() === '') {
        const code = item['COD. PRODUTO']
        if (code !== null && code !== undefined) {
          tipo = productTypeMap.get(code) || '-'
        } else {
          tipo = '-'
        }
      }

      return {
        // Cast to String to ensure large numbers/EANs are preserved accurately
        codProduto: item['COD. PRODUTO']
          ? String(item['COD. PRODUTO'])
          : item['COD. PRODUTO'],
        produto: item['MERCADORIA'],
        tipo: tipo,
        saldoInicial: item['SALDO INICIAL'],
        contagem: item['CONTAGEM'],
        quantidadeVendida: item['QUANTIDADE VENDIDA'],
        valorVendido: item['VALOR VENDIDO'],
        saldoFinal: item['SALDO FINAL'],
        novasConsignacoes: item['NOVAS CONSIGNAÇÕES'],
        devolucoes: item['RECOLHIDO'],
      }
    })

    const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: {
          reportType: 'detailed-order-report',
          format: 'A4',
          header,
          items,
          financials,
        },
        responseType: 'blob',
      },
    )

    if (pdfError) throw pdfError
    return pdfBlob as Blob
  },
}
