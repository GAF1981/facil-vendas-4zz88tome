import { z } from 'zod'

export interface Brinde {
  id: number
  cliente_codigo: number
  cliente_nome: string
  data: string
  produto_codigo: number
  produto_nome: string
  quantidade: number
  funcionario_id: number
  funcionario_nome: string
  created_at: string
}

export type BrindeInsert = Omit<Brinde, 'id' | 'created_at'>

export const brindeSchema = z.object({
  cliente_codigo: z.number({ required_error: 'Selecione um cliente' }),
  cliente_nome: z.string().min(1, 'Nome do cliente é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  produto_codigo: z.number({ required_error: 'Selecione um produto' }),
  produto_nome: z.string().min(1, 'Nome do produto é obrigatório'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que 0'),
  funcionario_id: z.number(),
  funcionario_nome: z.string(),
})

export type BrindeFormData = z.infer<typeof brindeSchema>
