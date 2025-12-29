export interface NotaFiscalSettlement {
  orderId: number
  dataAcerto: string
  valorTotalVendido: number
  notaFiscalCadastro: string
  notaFiscalVenda: string // Placeholder
  notaFiscalEmitida: boolean
}

export type NotaFiscalStatusFilter = 'all' | 'issued' | 'not_issued'
