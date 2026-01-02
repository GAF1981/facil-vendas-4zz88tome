export interface PixAcertoRow {
  orderId: number
  clientCode: number
  clientName: string
  employeeName: string // Seller (original)
  confirmedBy?: string // Employee who confirmed the pix
  value: number
  isConfirmed: boolean
}

export interface PixRecebimentoRow {
  id: number // ID from Recebimentos
  orderId: number
  clientCode: number
  paymentMethod: string
  value: number
  isConfirmed: boolean
  confirmedBy?: string
}
