import { supabase } from '@/lib/supabase/client'

export interface Supplier {
  id: number
  nome_fornecedor: string
  cnpj?: string | null
  telefone?: string | null
  endereco?: string | null
}

export const suppliersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .select('*')
      .order('nome_fornecedor')
    if (error) throw error
    return (data as Supplier[]) || []
  },
}
