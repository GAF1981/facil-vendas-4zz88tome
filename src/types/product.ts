import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

export type ProductRow = Database['public']['Tables']['PRODUTOS']['Row']
export type ProductInsert = Database['public']['Tables']['PRODUTOS']['Insert']
export type ProductUpdate = Database['public']['Tables']['PRODUTOS']['Update']

export const productSchema = z.object({
  ID: z.number().optional(), // Calculated automatically but required for payload
  PRODUTO: z
    .string()
    .min(2, 'Nome do produto deve ter no mínimo 2 caracteres')
    .nullable(),
  CODIGO: z.coerce.number().optional().nullable(),
  'CÓDIGO BARRAS': z.coerce.number().optional().nullable(),
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
