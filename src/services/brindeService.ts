import { supabase } from '@/lib/supabase/client'
import { Brinde, BrindeInsert } from '@/types/brinde'

export const brindeService = {
  async create(brinde: BrindeInsert, sessionId: number) {
    // 1. Insert into brinde table
    const { data: brindeData, error: brindeError } = await supabase
      .from('brinde')
      .insert(brinde)
      .select()
      .single()

    if (brindeError) throw brindeError

    // 2. Insert into ESTOQUE CARRO: CARRO PARA O CLIENTE to update stock
    // Fetch product ID for linking
    const { data: product } = await supabase
      .from('PRODUTOS')
      .select('ID')
      .eq('CODIGO', brinde.produto_codigo)
      .single()

    if (!product) {
      throw new Error(`Produto código ${brinde.produto_codigo} não encontrado.`)
    }

    const payload = {
      id_estoque_carro: sessionId,
      produto_id: product.ID,
      quantidade: brinde.quantidade,
      SAIDAS_carro_cliente: brinde.quantidade,
      pedido: null,
      data_horario: new Date(`${brinde.data}T12:00:00`).toISOString(),
      funcionario: brinde.funcionario_nome,
      codigo_produto: brinde.produto_codigo,
      produto: brinde.produto_nome,
    }

    const { error: stockError } = await supabase
      .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
      .insert(payload)

    if (stockError) throw stockError

    return brindeData
  },

  async getAll(filters?: {
    startDate?: string
    endDate?: string
    clientName?: string
    productName?: string
    employeeId?: string
  }) {
    let query = supabase.from('brinde').select('*')

    if (filters?.startDate) {
      query = query.gte('data', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('data', filters.endDate)
    }
    if (filters?.clientName) {
      query = query.ilike('cliente_nome', `%${filters.clientName}%`)
    }
    if (filters?.productName) {
      query = query.ilike('produto_nome', `%${filters.productName}%`)
    }
    if (filters?.employeeId && filters.employeeId !== 'todos') {
      query = query.eq('funcionario_id', filters.employeeId)
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    })
    if (error) throw error
    return data as Brinde[]
  },
}
