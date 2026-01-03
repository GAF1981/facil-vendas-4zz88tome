import { z } from 'zod'

export interface Despesa {
  id: number
  Data: string
  'Grupo de Despesas': 'Alimentação' | 'Combustível' | 'Outros'
  Detalhamento: string
  Valor: number
  funcionario_id: number
  // Joined
  funcionario_nome?: string
}

export type DespesaInsert = Omit<Despesa, 'id' | 'Data' | 'funcionario_nome'>

export const despesaSchema = z.object({
  grupo: z.enum(['Alimentação', 'Combustível', 'Outros'], {
    required_error: 'Selecione um grupo',
  }),
  detalhamento: z.string().optional(),
  valor: z.string().min(1, 'Valor é obrigatório'),
  funcionario_id: z.string().min(1, 'Selecione um funcionário'),
})

export type DespesaFormData = z.infer<typeof despesaSchema>
