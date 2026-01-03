import { supabase } from '@/lib/supabase/client'
import { DespesaInsert } from '@/types/despesa'
import { Rota } from '@/types/rota'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'

export interface CaixaSummaryRow {
  funcionarioId: number
  funcionarioNome: string
  totalRecebido: number
  totalDespesas: number
  saldo: number
}

export const caixaService = {
  async saveDespesa(despesa: DespesaInsert) {
    const { error } = await supabase.from('DESPESAS').insert({
      'Grupo de Despesas': despesa['Grupo de Despesas'],
      Detalhamento: despesa.Detalhamento,
      Valor: despesa.Valor,
      funcionario_id: despesa.funcionario_id,
      Data: new Date().toISOString(),
    })

    if (error) throw error
  },

  async getFinancialSummary(rota: Rota): Promise<CaixaSummaryRow[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    // 1. Fetch Employees
    const { data: employees, error: empError } = await supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')

    if (empError) throw empError

    const summaryMap = new Map<number, CaixaSummaryRow>()
    employees?.forEach((emp) => {
      summaryMap.set(emp.id, {
        funcionarioId: emp.id,
        funcionarioNome: emp.nome_completo,
        totalRecebido: 0,
        totalDespesas: 0,
        saldo: 0,
      })
    })

    // 2. Fetch Receipts (RECEBIMENTOS) within Route range
    // We filter by created_at which indicates when the money entered the system
    const { data: receipts, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select('funcionario_id, valor_pago, created_at')
      .gte('created_at', rota.data_inicio) // Optimistic filter
      .gt('valor_pago', 0)

    if (recError) throw recError

    receipts?.forEach((rec) => {
      if (!rec.created_at) return
      const recDate = parseISO(rec.created_at)

      // Precise filtering
      const isAfterStart =
        isAfter(recDate, routeStart) || isEqual(recDate, routeStart)
      const isBeforeEnd =
        isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)

      if (isAfterStart && (rota.data_fim ? isBeforeEnd : true)) {
        const empId = rec.funcionario_id
        if (summaryMap.has(empId)) {
          const entry = summaryMap.get(empId)!
          entry.totalRecebido += Number(rec.valor_pago)
        }
      }
    })

    // 3. Fetch Expenses (DESPESAS) within Route range
    const { data: expenses, error: expError } = await supabase
      .from('DESPESAS')
      .select('funcionario_id, Valor, Data')
      .gte('Data', rota.data_inicio)

    if (expError) throw expError

    expenses?.forEach((exp) => {
      if (!exp.Data) return
      const expDate = parseISO(exp.Data)

      const isAfterStart =
        isAfter(expDate, routeStart) || isEqual(expDate, routeStart)
      const isBeforeEnd =
        isBefore(expDate, routeEnd) || isEqual(expDate, routeEnd)

      if (isAfterStart && (rota.data_fim ? isBeforeEnd : true)) {
        const empId = exp.funcionario_id
        if (summaryMap.has(empId)) {
          const entry = summaryMap.get(empId)!
          entry.totalDespesas += Number(exp.Valor)
        }
      }
    })

    // 4. Calculate Balance and Filter empty rows (optional, user story implies tracking for each member)
    // We will return all employees who have activity
    const result = Array.from(summaryMap.values())
      .map((row) => ({
        ...row,
        saldo: row.totalRecebido - row.totalDespesas,
      }))
      .filter(
        (row) =>
          Math.abs(row.totalRecebido) > 0.01 ||
          Math.abs(row.totalDespesas) > 0.01,
      )
      .sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome))

    return result
  },
}
