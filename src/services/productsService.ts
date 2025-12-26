import { supabase } from '@/lib/supabase/client'
import { Product } from '@/types/product'

export const productsService = {
  async getProducts(page = 1, pageSize = 20, search = '') {
    let query = supabase.from('PRODUTOS').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumeric = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumeric) {
        // Search in CODIGO (numeric) or CÓDIGO BARRAS (numeric)
        // We use explicit OR syntax compatible with PostgREST for numeric columns
        query = query.or(
          `CODIGO.eq.${searchTerm},"CÓDIGO BARRAS".eq.${searchTerm}`,
        )
      } else {
        // Search text in MERCADORIA or DESCRIÇÃO RESUMIDA
        // We use ilike for case-insensitive partial match
        query = query.or(
          `MERCADORIA.ilike.%${searchTerm}%, "DESCRIÇÃO RESUMIDA".ilike.%${searchTerm}%`,
        )
      }
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('MERCADORIA', { ascending: true })
      .range(from, to)

    if (error) throw error

    return {
      data: data as Product[],
      count: count || 0,
    }
  },

  async getByBarcode(barcode: number) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('*')
      .eq('CÓDIGO BARRAS', barcode)
      .single()

    if (error) return null
    return data as Product
  },
}
