export interface DeliveryHistoryRow {
  id: number
  id_estoque_carro: number
  data_movimento: string | null
  pedido: number | null
  codigo_produto: number | null
  produto: string | null
  quantidade: number | null
  funcionario: string | null
  codigo_cliente: number | null
  nome_cliente: string | null
}

export interface DeliveryHistoryFilter {
  startDate?: string
  endDate?: string
  search?: string
}
