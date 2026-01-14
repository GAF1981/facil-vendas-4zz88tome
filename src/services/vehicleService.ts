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
}
