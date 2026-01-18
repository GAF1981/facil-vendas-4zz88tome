import { supabase } from '@/lib/supabase/client'
import {
  RotaMotoqueiroKm,
  RotaMotoqueiroKmInsert,
} from '@/types/rota_motoqueiro'

export const rotaMotoqueiroService = {
  async getAll(month?: string) {
    let query = supabase
      .from('rota_motoqueiro_km')
      .select('*, funcionario:FUNCIONARIOS(nome_completo)')
      .order('data_hora', { ascending: false })

    if (month) {
      // month format: YYYY-MM
      const [year, monthNum] = month.split('-').map(Number)

      // Start of month: 1st day 00:00:00 Local Time
      // We rely on new Date(year, monthIndex) using the browser's local timezone
      const startDate = new Date(year, monthNum - 1, 1)
      startDate.setHours(0, 0, 0, 0)

      // End of month: Last day 23:59:59.999 Local Time
      const endDate = new Date(year, monthNum, 0)
      endDate.setHours(23, 59, 59, 999)

      query = query
        .gte('data_hora', startDate.toISOString())
        .lte('data_hora', endDate.toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    return data as RotaMotoqueiroKm[]
  },

  async create(data: RotaMotoqueiroKmInsert) {
    const { error } = await supabase.from('rota_motoqueiro_km').insert(data)
    if (error) throw error
  },

  async update(id: number, data: Partial<RotaMotoqueiroKmInsert>) {
    const { error } = await supabase
      .from('rota_motoqueiro_km')
      .update(data)
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('rota_motoqueiro_km')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
