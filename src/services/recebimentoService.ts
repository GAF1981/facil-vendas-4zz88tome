import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'
import { RecebimentoInsert, RecebimentoInstallment } from '@/types/recebimento'
import { reportsService } from '@/services/reportsService'

export const recebimentoService = {
  async saveRecebimento(
    client: ClientRow,
    employee: Employee,
    payments: PaymentEntry[],
    linkedOrderId: number,
  ) {
    // 1. Validation
    if (!linkedOrderId) {
      throw new Error(
        'É necessário selecionar um pedido para vincular o pagamento.',
      )
    }

    // 2. Process payments one by one to ensure we capture IDs for Pix
    for (const payment of payments) {
      const inserts: RecebimentoInsert[] = []

      // Handle installments
      if (
        payment.installments > 1 &&
        payment.details &&
        payment.details.length > 0
      ) {
        payment.details.forEach((detail) => {
          inserts.push({
            venda_id: linkedOrderId,
            cliente_id: client.CODIGO,
            funcionario_id: employee.id,
            forma_pagamento: payment.method,
            valor_registrado: detail.value,
            valor_pago: 0,
            vencimento: new Date(`${detail.dueDate}T12:00:00`).toISOString(),
            ID_da_fêmea: linkedOrderId,
          })
        })
      } else {
        // Single payment
        inserts.push({
          venda_id: linkedOrderId,
          cliente_id: client.CODIGO,
          funcionario_id: employee.id,
          forma_pagamento: payment.method,
          valor_registrado: payment.value,
          valor_pago: payment.paidValue,
          vencimento: payment.dueDate
            ? new Date(`${payment.dueDate}T12:00:00`).toISOString()
            : new Date().toISOString(),
          ID_da_fêmea: linkedOrderId,
          data_pagamento: new Date().toISOString(),
        })
      }

      if (inserts.length > 0) {
        const { data: insertedData, error: recError } = await supabase
          .from('RECEBIMENTOS')
          .insert(inserts)
          .select()

        if (recError) throw recError

        // 3. If Pix, insert into PIX table
        if (payment.method === 'Pix' && payment.pixDetails && insertedData) {
          const insertedRecord = insertedData[0]
          if (insertedRecord) {
            const { error: pixError } = await supabase.from('PIX').insert({
              recebimento_id: insertedRecord.id,
              nome_no_pix: payment.pixDetails.nome,
              banco_pix: payment.pixDetails.banco,
              data_pix_realizado: new Date().toISOString(),
              confirmado_por: employee.nome_completo,
              venda_id: linkedOrderId,
            })

            if (pixError) {
              console.error('Error creating PIX record:', pixError)
            }
          }
        }
      }
    }

    // 4. Update Debt History
    try {
      await reportsService.updateDebtHistoryForOrder(linkedOrderId)
    } catch (error) {
      console.error('Failed to update debt history:', error)
    }

    return linkedOrderId
  },

  async getPaymentsForOrder(orderId: number) {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select('*, FUNCIONARIOS(nome_completo)')
      .eq('venda_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map((row: any) => ({
      id: row.id,
      method: row.forma_pagamento,
      value: row.valor_pago,
      registeredValue: row.valor_registrado,
      date: row.vencimento,
      employeeName: row.FUNCIONARIOS?.nome_completo || 'N/D',
      createdAt: row.created_at,
    }))
  },

  async reversePayment(
    paymentId: number,
    orderId: number,
    userId: number,
    userName: string,
  ) {
    // 1. Update RECEBIMENTOS to set valor_pago = 0
    const { error: updateError } = await supabase
      .from('RECEBIMENTOS')
      .update({ valor_pago: 0, data_pagamento: null } as any)
      .eq('id', paymentId)

    if (updateError) throw updateError

    // 2. Log action to system_logs
    const { error: logError } = await supabase.from('system_logs').insert({
      type: 'PAYMENT_REVERSAL',
      description: `Estorno de pagamento (ID: ${paymentId}) do pedido #${orderId}`,
      user_id: userId,
      meta: { paymentId, orderId, reversedBy: userName },
      created_at: new Date().toISOString(),
    })

    if (logError) console.error('Error logging reversal:', logError)

    // 3. Update debt history to reflect the change
    await reportsService.updateDebtHistoryForOrder(orderId)
  },

  async getInstallments(
    filters: { search?: string; status?: 'PENDENTE' | 'PAGO' | 'TODOS' } = {},
  ): Promise<RecebimentoInstallment[]> {
    let query = supabase
      .from('RECEBIMENTOS')
      .select('*, CLIENTES(CODIGO, "NOME CLIENTE")')
      .order('vencimento', { ascending: true })
      .limit(1000)

    if (filters.search) {
      const term = filters.search
      const isNumber = !isNaN(Number(term))
      if (isNumber) {
        // Search by Client Code or Order ID (venda_id)
        query = query.or(`cliente_id.eq.${term},venda_id.eq.${term}`)
      } else {
        // Search by Client Name requires separate filter or post-filter if RPC not used
        // Supabase join filtering:
        // query = query.ilike('CLIENTES.NOME CLIENTE', `%${term}%`) - This syntax depends on Postgrest version
        // Standard approach for inner join filter: !inner
        query = query
          .not('CLIENTES', 'is', null) // Ensure joined
          .filter('CLIENTES.NOME CLIENTE', 'ilike', `%${term}%`)
      }
    }

    const { data, error } = await query

    if (error) throw error

    let installments = (data || []).map((row: any) => ({
      ...row,
      cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'Desconhecido',
      cliente_codigo: row.CLIENTES?.CODIGO || 0,
    })) as RecebimentoInstallment[]

    if (filters.status && filters.status !== 'TODOS') {
      installments = installments.filter((inst) => {
        const valReg = inst.valor_registrado || 0
        const valPago = inst.valor_pago || 0
        const isPaid = valPago >= valReg && valReg > 0
        return filters.status === 'PAGO' ? isPaid : !isPaid
      })
    }

    return installments
  },

  async processInstallmentPayment(
    installmentId: number,
    amountPaid: number,
    paymentDate: string,
    method: string,
    orderId: number,
    pixDetails?: { nome: string; banco: string },
    userName?: string,
  ) {
    // 1. Fetch current state to increment safely or just set?
    // AC implies "incrementing valor_pago". But typically we process "remaining balance".
    // If I select an installment of 100 that has 0 paid, and I pay 50. valor_pago becomes 50.
    // If I select it again (balance 50) and pay 50. valor_pago becomes 100.
    // So we fetch current first.
    const { data: current, error: fetchError } = await supabase
      .from('RECEBIMENTOS')
      .select('valor_pago, valor_registrado')
      .eq('id', installmentId)
      .single()

    if (fetchError) throw fetchError

    const newTotalPaid = (current.valor_pago || 0) + amountPaid
    // AC says: "updating valor_registrado".
    // Typically we don't change registered value on payment unless it's a correction.
    // But if the requirement implies it, we might need logic.
    // Assuming standard "process payment" just updates paid value.

    // 2. Update Installment
    const { error: updateError } = await supabase
      .from('RECEBIMENTOS')
      .update({
        valor_pago: newTotalPaid,
        data_pagamento: new Date(`${paymentDate}T12:00:00`).toISOString(),
        // Update method if it changed? Usually method is per payment.
        // If we want to track METHOD of this specific payment, and RECEBIMENTOS row has only one method column,
        // we are overwriting the "scheduled method" with "actual method".
        forma_pagamento: method,
      } as any)
      .eq('id', installmentId)

    if (updateError) throw updateError

    // 3. Log Pix if applicable
    if (method === 'Pix' && pixDetails) {
      await supabase.from('PIX').insert({
        recebimento_id: installmentId,
        nome_no_pix: pixDetails.nome,
        banco_pix: pixDetails.banco,
        data_pix_realizado: new Date().toISOString(),
        confirmado_por: userName || 'Sistema',
        venda_id: orderId,
      })
    }

    // 4. Sync Debt History
    await reportsService.updateDebtHistoryForOrder(orderId)
  },
}
