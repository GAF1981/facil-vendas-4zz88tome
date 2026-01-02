import { z } from 'zod'

export interface PagamentoRow {
  id: number
  // Mapped from ID_da_fêmea
  id_da_femea: number | null
  // Mapped from cliente_id
  cliente_id: number
  // Mapped from joined CLIENTES table
  cliente_nome: string
  // Mapped from forma_pagamento
  forma_pagamento: string
  // Mapped from valor_pago
  valor: number
  // Mapped from vencimento or created_at
  data: string | null
}
