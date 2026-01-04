import { supabase } from '@/lib/supabase/client'
import { FechamentoCaixa, FechamentoInsert } from '@/types/fechamento'
import { Rota } from '@/types/rota'
import { resumoAcertosService } from './resumoAcertosService'
import { caixaService } from './caixaService'

export const fechamentoService = {
  async getByRoute(rotaId: number) {
    const { data, error } = await supabase
      .from('fechamento_caixa')
      .select(
        `
        *,
        funcionario:FUNCIONARIOS!funcionario_id ( nome_completo, foto_url ),
        responsavel:FUNCIONARIOS!responsavel_id ( nome_completo )
      `,
      )
      .eq('rota_id', rotaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FechamentoCaixa[]
  },

  async createClosing(rota: Rota, funcionarioId: number) {
    // 1. Calculate Financial Totals
    const settlements = await resumoAcertosService.getSettlements(rota)

    // Filter settlements for this employee
    const employeeSettlements = settlements.filter(
      (s) => s.employeeId === funcionarioId,
    )

    const vendaTotal = employeeSettlements.reduce(
      (acc, s) => acc + s.totalSalesValue,
      0,
    )
    const descontoTotal = employeeSettlements.reduce(
      (acc, s) => acc + s.totalDiscount,
      0,
    )
    const valorAReceber = employeeSettlements.reduce(
      (acc, s) => acc + s.valorDevido,
      0,
    )

    // 2. Calculate Payment Totals (Cash, Pix, Cheque)
    const receipts = await caixaService.getEmployeeReceipts(funcionarioId, rota)

    // Filter out 'Boleto'
    const validReceipts = receipts.filter((r) => r.forma !== 'Boleto')

    const valorDinheiro = validReceipts
      .filter((r) => r.forma === 'Dinheiro')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorPix = validReceipts
      .filter((r) => r.forma === 'Pix')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorCheque = validReceipts
      .filter((r) => r.forma === 'Cheque')
      .reduce((acc, r) => acc + r.valor, 0)

    // 3. Calculate Expense Totals
    const expenses = await caixaService.getEmployeeExpenses(funcionarioId, rota)
    const valorDespesas = expenses.reduce((acc, e) => acc + e.valor, 0)

    // 4. Insert Record
    const payload: FechamentoInsert = {
      rota_id: rota.id,
      funcionario_id: funcionarioId,
      venda_total: vendaTotal,
      desconto_total: descontoTotal,
      valor_a_receber: valorAReceber,
      valor_dinheiro: valorDinheiro,
      valor_pix: valorPix,
      valor_cheque: valorCheque,
      valor_despesas: valorDespesas,
      status: 'Aberto',
    }

    const { data, error } = await supabase
      .from('fechamento_caixa')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data as FechamentoCaixa
  },

  async updateApproval(
    id: number,
    field:
      | 'dinheiro_aprovado'
      | 'pix_aprovado'
      | 'cheque_aprovado'
      | 'despesas_aprovadas',
    value: boolean,
  ) {
    const { error } = await supabase
      .from('fechamento_caixa')
      .update({ [field]: value })
      .eq('id', id)

    if (error) throw error
  },

  async confirmClosing(id: number, responsavelId: number) {
    // Also updating created_at to current time to reflect precise closing time if needed,
    // but usually created_at is creation time.
    // The requirement says "Recording and displaying the specific date and time of cashier closure."
    // Let's assume closing is when status becomes 'Fechado'.
    // We will update created_at to now() OR use a new column 'closed_at' if schema allowed.
    // Since we can't easily change schema without explicit instruction and the existing one has created_at,
    // we'll treat the updated_at/closed moment as the confirmation time.
    // Actually, `fechamento_caixa` in schema provided has `created_at`.
    // We can rely on `created_at` being the *start* of closing process.
    // The user story asks to record the time of closure.
    // Let's update `created_at` to NOW on confirmation to signify "Final Closure Time" or just rely on audit.
    // Better: Update `created_at` to now() when confirming to reflect the FINAL closure time in the record.
    const { error } = await supabase
      .from('fechamento_caixa')
      .update({
        status: 'Fechado',
        responsavel_id: responsavelId,
        created_at: new Date().toISOString(), // Update timestamp to confirmation time
      })
      .eq('id', id)

    if (error) throw error
  },

  async checkExistingClosing(rotaId: number, funcionarioId: number) {
    const { count, error } = await supabase
      .from('fechamento_caixa')
      .select('id', { count: 'exact', head: true })
      .eq('rota_id', rotaId)
      .eq('funcionario_id', funcionarioId)

    if (error) throw error
    return (count || 0) > 0
  },

  // Helper to check closure status specifically
  async getClosureStatus(rotaId: number, funcionarioId: number) {
    const { data, error } = await supabase
      .from('fechamento_caixa')
      .select('status')
      .eq('rota_id', rotaId)
      .eq('funcionario_id', funcionarioId)
      .maybeSingle()

    if (error) throw error
    return data?.status || null // 'Aberto', 'Fechado', or null (not started)
  },
}
