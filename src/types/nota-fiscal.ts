export interface NotaFiscalSettlement {
  orderId: number
  dataAcerto: string
  valorTotalVendido: number
  notaFiscalCadastro: string
  notaFiscalVenda: string
  notaFiscalEmitida: string // Changed from boolean to string
}

export type NotaFiscalStatusFilter =
  | 'all'
  | 'Emitida'
  | 'Pendente'
  | 'Resolvida'

export const NOTA_FISCAL_STATUSES = ['Emitida', 'Pendente', 'Resolvida']
