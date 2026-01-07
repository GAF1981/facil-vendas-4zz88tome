export interface InventoryProduct {
  id: number
  codigo: number | null
  produto: string | null
  grupo: string | null
  preco: number
  codigo_barras: number | null
}

export interface InventorySession {
  id: number
  created_at: string
  data_inicio: string
  data_fim: string | null
  funcionario_id: number | null
  status: 'em_andamento' | 'finalizado' | 'cancelado'
  tipo: string
}

export interface InventorySessionInsert {
  data_inicio: string
  funcionario_id: number | null
  status: 'em_andamento'
  tipo: 'GERAL' | 'PARCIAL'
}
