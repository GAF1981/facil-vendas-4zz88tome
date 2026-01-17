import { Database } from '@/lib/supabase/types'

export interface RecebimentoInsert {
  venda_id: number
  cliente_id: number
  forma_pagamento: string
  valor_registrado?: number
  valor_pago: number
  vencimento?: string
  funcionario_id: number
  forma_cobranca?: string | null
  data_combinada?: string | null
  ID_da_fêmea?: number
  data_pagamento?: string | null
}

export interface RecebimentoRow {
  id: number
  venda_id: number
  cliente_id: number
  forma_pagamento: string
  valor_registrado: number | null
  valor_pago: number
  vencimento: string | null
  funcionario_id: number
  forma_cobranca: string | null
  data_combinada: string | null
  ID_da_fêmea: number | null
  created_at: string | null
  data_pagamento: string | null
}

export interface RecebimentoInstallment extends RecebimentoRow {
  cliente_nome: string
  cliente_codigo: number
}
