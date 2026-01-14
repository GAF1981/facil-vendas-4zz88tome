import { supabase } from '@/lib/supabase/client'
import { Vehicle, VehicleInsert, VehicleUpdate } from '@/types/vehicle'

export const vehicleService = {
  async getAll() {
    const { data, error } = await supabase
      .from('VEICULOS')
      .select('*')
      .order('placa', { ascending: true })

    if (error) throw error
    return data as Vehicle[]
  },

  async getActive() {
    const { data, error } = await supabase
      .from('VEICULOS')
      .select('*')
      .eq('status', 'ATIVO')
      .order('placa', { ascending: true })

    if (error) throw error
    return data as Vehicle[]
  },

  async create(vehicle: VehicleInsert) {
    const { data, error } = await supabase
      .from('VEICULOS')
      .insert(vehicle)
      .select()
      .single()

    if (error) throw error
    return data as Vehicle
  },

  async update(id: number, vehicle: VehicleUpdate) {
    const { data, error } = await supabase
      .from('VEICULOS')
      .update(vehicle)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Vehicle
  },

  async delete(id: number) {
    const { error } = await supabase.from('VEICULOS').delete().eq('id', id)
    if (error) throw error
  },

  async getLastOdometer(vehicleId: number): Promise<number> {
    // 1. Check last expense odometer
    const { data: expenseData, error: expenseError } = await supabase
      .from('DESPESAS')
      .select('hodometro')
      .eq('veiculo_id', vehicleId)
      .not('hodometro', 'is', null)
      .order('Data', { ascending: false }) // Order by Date descending
      .limit(1)
      .maybeSingle()

    if (expenseError) throw expenseError

    if (expenseData && expenseData.hodometro) {
      return expenseData.hodometro
    }

    // 2. Fallback to vehicle registration odometer
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('VEICULOS')
      .select('hodometro_cadastro')
      .eq('id', vehicleId)
      .single()

    if (vehicleError) throw vehicleError

    return vehicleData.hodometro_cadastro || 0
  },

  async getExpenses(filters?: {
    startDate?: string
    endDate?: string
    vehicleId?: string | 'todos'
    search?: string
  }) {
    let query = supabase
      .from('DESPESAS')
      .select(
        `
        *,
        FUNCIONARIOS ( nome_completo ),
        VEICULOS ( placa )
      `,
      )
      .not('veiculo_id', 'is', null)
      .order('Data', { ascending: false })

    if (filters?.startDate) {
      query = query.gte('Data', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('Data', filters.endDate)
    }
    if (filters?.vehicleId && filters.vehicleId !== 'todos') {
      query = query.eq('veiculo_id', filters.vehicleId)
    }
    if (filters?.search) {
      query = query.or(
        `Detalhamento.ilike.%${filters.search}%,prestador_servico.ilike.%${filters.search}%`,
      )
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },
}
