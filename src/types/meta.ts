export interface MetaFuncionario {
  id: number
  funcionario_id: number
  meta_diaria: number
  meta_mensal: number | null
  created_at: string
}

export interface MetaPeriodo {
  id: number
  funcionario_id: number
  data_inicio: string
  data_fim: string
  valor_meta: number
  created_at: string
}
