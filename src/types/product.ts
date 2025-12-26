import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

// Define Product type based on Supabase schema
export type Product = Database['public']['Tables']['PRODUTOS']['Row']
export type ProductInsert = Database['public']['Tables']['PRODUTOS']['Insert']
export type ProductUpdate = Database['public']['Tables']['PRODUTOS']['Update']

// Helper to format price for display
export const formatPrice = (price: string | null) => {
  if (!price) return 'R$ 0,00'

  // Clean the string to handle potential different formats stored in DB
  let clean = price.replace('R$', '').trim()

  // Heuristic: if it has comma and dot (e.g. 1.000,00), remove dot and replace comma
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    // If just comma (e.g. 100,50), replace with dot
    clean = clean.replace(',', '.')
  }

  const num = parseFloat(clean)
  if (isNaN(num)) return price // Fallback to original string if parsing fails

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

// Zod Schema for validation
export const productSchema = z.object({
  CODIGO: z.coerce
    .number({ required_error: 'Código é obrigatório' })
    .min(1, 'Código deve ser maior que 0'),
  'CÓDIGO BARRAS': z.coerce
    .number()
    .min(0, 'Código de barras inválido')
    .optional(),
  PRODUTOS: z.string().min(2, 'Nome do produto é obrigatório'),
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
