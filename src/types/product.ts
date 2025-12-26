import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

export type ProductRow = Database['public']['Tables']['PRODUTOS']['Row']
export type ProductInsert = Database['public']['Tables']['PRODUTOS']['Insert']
export type ProductUpdate = Database['public']['Tables']['PRODUTOS']['Update']

// Helper to handle empty strings as null for numbers
const numberOrNull = z.preprocess(
  (val) =>
    val === '' || val === null || val === undefined ? null : Number(val),
  z.number().nullable().optional(),
)

export const productSchema = z.object({
  ID: z.coerce
    .number()
    .int('O ID deve ser um número inteiro')
    .min(1, 'O ID é obrigatório e deve ser positivo'),
  PRODUTO: z
    .string()
    .min(2, 'Nome do produto deve ter no mínimo 2 caracteres')
    .nullable(),
  CODIGO: numberOrNull,
  'CÓDIGO BARRAS': numberOrNull,
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
