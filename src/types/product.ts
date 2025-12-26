import { Database } from '@/lib/supabase/types'

export type Product = Database['public']['Tables']['PRODUTOS']['Row']

// Helper to format price since it comes as string (likely formatted or raw number string)
export const formatPrice = (price: string | null) => {
  if (!price) return 'R$ 0,00'

  // Clean R$ and spaces
  let clean = price.replace('R$', '').trim()

  // Heuristic to handle different number formats
  // If it looks like 1.000,00 (Brazilian), normalize to 1000.00
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    // If just comma: 100,50 -> 100.50
    clean = clean.replace(',', '.')
  }

  const num = parseFloat(clean)
  if (isNaN(num)) return price // Return original if parsing fails

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}
