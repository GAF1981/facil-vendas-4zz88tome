import { z } from 'zod'

export interface Vehicle {
  id: number
  placa: string
  status: 'ATIVO' | 'INATIVO'
  hodometro_cadastro: number
  created_at: string
}

export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at'>
export type VehicleUpdate = Partial<VehicleInsert>

export const vehicleSchema = z.object({
  placa: z
    .string()
    .min(7, 'A placa deve ter pelo menos 7 caracteres')
    .transform((val) => val.toUpperCase()),
  status: z.enum(['ATIVO', 'INATIVO']),
  hodometro_cadastro: z.coerce
    .number()
    .min(0, 'Hodômetro deve ser maior ou igual a 0'),
})

export type VehicleFormData = z.infer<typeof vehicleSchema>
