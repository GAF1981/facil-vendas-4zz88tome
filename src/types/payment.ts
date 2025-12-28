export type PaymentMethodType =
  | 'Boleto'
  | 'Boleto Parcelado'
  | 'Pix'
  | 'Dinheiro'
  | 'Cheque'

export interface PaymentEntry {
  method: PaymentMethodType
  value: number
  installments: number
  dueDate: string
}

export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Boleto',
  'Boleto Parcelado',
  'Pix',
  'Dinheiro',
  'Cheque',
]
