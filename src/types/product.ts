import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

// Manually extending types since we can't regenerate supabase types in this environment
// Adding the new FREQUENTES column as defined in the migration
// Adding the new codigo_interno column as defined in the migration
interface AdditionalProductFields {
  FREQUENTES?: string | null
  codigo_interno?: number | null
}

export type ProductRow = Database['public']['Tables']['PRODUTOS']['Row'] &
  AdditionalProductFields
export type ProductInsert = Database['public']['Tables']['PRODUTOS']['Insert'] &
  AdditionalProductFields
export type ProductUpdate = Database['public']['Tables']['PRODUTOS']['Update'] &
  AdditionalProductFields

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
  codigo_interno: numberOrNull,
  'CÓDIGO BARRAS': numberOrNull,
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
  FREQUENTES: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
