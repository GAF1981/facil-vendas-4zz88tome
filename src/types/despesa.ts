import { z } from 'zod'

export interface Despesa {
  id: number
  Data: string
  'Grupo de Despesas': 'Alimentação' | 'Combustível' | 'Gasolina' | 'Outros'
  Detalhamento: string
  Valor: number
  funcionario_id: number
  saiu_do_caixa: boolean
  hodometro?: number | null
  veiculo_id?: number | null
  // Joined
  funcionario_nome?: string
  veiculo_placa?: string
}

export type DespesaInsert = Omit<
  Despesa,
  'id' | 'funcionario_nome' | 'veiculo_placa'
>

export const despesaSchema = z.object({
  data: z.string().optional(), // Date string from input type="date"
  grupo: z.enum(['Alimentação', 'Combustível', 'Gasolina', 'Outros'], {
    required_error: 'Selecione um grupo',
  }),
  detalhamento: z.string().optional(),
  valor: z.string().min(1, 'Valor é obrigatório'),
  funcionario_id: z.string().min(1, 'Selecione um funcionário'),
  saiu_do_caixa: z.boolean().default(true),
  hodometro: z.string().optional(),
  veiculo_id: z.string().optional(),
})

export type DespesaFormData = z.infer<typeof despesaSchema>
