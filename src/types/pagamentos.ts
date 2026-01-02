export interface PagamentoRow {
  id: number
  venda_id: number
  id_da_femea: number | null
  cliente_id: number
  cliente_nome: string
  forma_pagamento: string
  valor: number
  data: string | null
}
