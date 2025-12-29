import { z } from 'zod'

export interface Pendencia {
  id: number
  cliente_id: number
  funcionario_id: number
  descricao_pendencia: string
  resolvida: boolean
  descricao_resolucao: string | null
  created_at: string
  // Joined fields
  CLIENTES?: {
    CODIGO: number
    'NOME CLIENTE': string
    'TIPO DE CLIENTE': string | null
  }
  FUNCIONARIOS?: {
    id: number
    nome_completo: string
  }
}

export type PendenciaInsert = Omit<
  Pendencia,
  'id' | 'created_at' | 'CLIENTES' | 'FUNCIONARIOS'
>
export type PendenciaUpdate = Partial<PendenciaInsert>

export const pendenciaSchema = z.object({
  cliente_id: z.number({ required_error: 'Cliente é obrigatório' }),
  funcionario_id: z.number({ required_error: 'Funcionário é obrigatório' }),
  descricao_pendencia: z
    .string()
    .min(3, 'A descrição deve ter pelo menos 3 caracteres'),
})

export type PendenciaFormData = z.infer<typeof pendenciaSchema>

export const resolucaoSchema = z.object({
  descricao_resolucao: z
    .string()
    .min(3, 'A resolução deve ter pelo menos 3 caracteres'),
})

export type ResolucaoFormData = z.infer<typeof resolucaoSchema>
