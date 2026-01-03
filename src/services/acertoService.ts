import { supabase } from '@/lib/supabase/client'
import { Acerto } from '@/types/acerto'
import { bancoDeDadosService } from './bancoDeDadosService'
import { clientsService } from './clientsService'
import { parseCurrency } from '@/lib/formatters'
import { PaymentEntry } from '@/types/payment'

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

  async reprintOrder(orderId: number) {
    const { items: dbItems, payments: dbPayments } =
      await bancoDeDadosService.getOrderDetails(orderId)

    if (dbItems.length === 0 && dbPayments.length === 0) {
      throw new Error('Pedido não encontrado.')
    }

    // Attempt to get context from first item
    let clientId: number | null = null
    let funcionarioName = 'Não identificado'
    let dateStr = new Date().toISOString()
    let descontoStr = '0'

    if (dbItems.length > 0) {
      const first = dbItems[0]
      clientId = first['CÓDIGO DO CLIENTE']
      funcionarioName = first['FUNCIONÁRIO'] || 'Não identificado'
      dateStr = first['DATA DO ACERTO'] || dateStr
      descontoStr = first['DESCONTO POR GRUPO'] || '0'
    } else if (dbPayments.length > 0) {
      // Fallback if no items (e.g. just debt payment)
      const first = dbPayments[0]
      clientId = first.cliente_id
      // We might need to fetch employee name if not in payment
      // Payment has funcionario_id
    }

    if (!clientId) throw new Error('Dados do cliente não encontrados.')

    const client = await clientsService.getById(clientId)

    const items = dbItems.map((item) => ({
      uid: item['ID VENDA ITENS']?.toString() || Math.random().toString(),
      produtoId: 0,
      produtoCodigo: item['COD. PRODUTO'],
      produtoNome: item['MERCADORIA'] || '',
      tipo: item['TIPO'],
      precoUnitario: parseCurrency(item['PREÇO VENDIDO']),
      saldoInicial: item['SALDO INICIAL'] || 0,
      contagem: item['CONTAGEM'] || 0,
      quantVendida: parseCurrency(item['QUANTIDADE VENDIDA']),
      valorVendido: parseCurrency(item['VALOR VENDIDO']),
      saldoFinal: item['SALDO FINAL'] || 0,
    }))

    const payments: PaymentEntry[] = dbPayments.map((p) => ({
      method: p.forma_pagamento as any,
      value: p.valor_registrado || 0,
      paidValue: p.valor_pago || 0,
      installments: 1,
      dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
    }))

    const totalVendido = items.reduce((acc, i) => acc + i.valorVendido, 0)
    const descontoVal = parseCurrency(descontoStr.replace('%', ''))
    const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
    const valorDesconto = totalVendido * discountFactor
    const valorAcerto = totalVendido - valorDesconto
    const valorPago = payments.reduce((acc, p) => acc + p.paidValue, 0)
    const debito = Math.max(0, valorAcerto - valorPago)

    const data = {
      client,
      employee: { nome_completo: funcionarioName },
      items,
      date: dateStr,
      acertoTipo: 'ACERTO (REIMPRESSÃO)',
      totalVendido,
      valorDesconto,
      valorAcerto,
      valorPago,
      debito,
      payments,
      orderNumber: orderId,
      preview: false,
      signature: null,
    }

    return this.generatePdf(data)
  },
}
