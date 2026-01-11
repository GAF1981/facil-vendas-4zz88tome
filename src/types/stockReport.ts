import { Database } from '@/lib/supabase/types'

export interface StockReportRow {
  id: number
  numero_pedido: number | null
  data_hora_acerto: string | null
  codigo_cliente: number | null
  cliente_nome: string | null
  produto_nome: string | null
  saldo_final: number | null
  preco_vendido: number | null
  estoque_por_produto: number | null
  estoque_final: number | null
  created_at: string
}

export interface StockFinalReportRow {
  id: number
  'NUMERO DO PEDIDO': number | null
  'DATA E HORA DO ACERTO': string | null
  'CÓDIGO DO CLIENTE': number | null
  CLIENTE: string | null
  'CÓDIGO DO PRODUTO': number | null
  MERCADORIA: string | null
  'SALDO FINAL': number | null
  'PREÇO VENDIDO': number | null
  'VALOR ESTOQUE POR PRODUTO': number | null
  'VALOR ESTOQUE SALDO FINAL': number | null
}

export interface StockReportFilters {
  numero_pedido?: string
  codigo_cliente?: string
  cliente_nome?: string
  startDate?: Date
  endDate?: Date
  mode: 'live' | 'history'
}
