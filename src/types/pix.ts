export interface PixTransactionRow {
  orderId: number
  clientCode: number
  clientName: string
  employeeName: string
  // Acerto Context
  acertoPixValue: number
  acertoPixConfirmed: boolean
  // Recebimento Context
  recebimentoPixValue: number
  recebimentoPixConfirmed: boolean
}
