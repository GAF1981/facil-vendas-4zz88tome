export type PaymentMethodType = 'Boleto' | 'Pix' | 'Dinheiro' | 'Cheque'

export interface PaymentInstallment {
  number: number
  value: number
  dueDate: string
}

export interface PaymentEntry {
  method: PaymentMethodType
  value: number
  installments: number
  dueDate: string
  details?: PaymentInstallment[] // For granular control
}

export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Boleto',
  'Pix',
  'Dinheiro',
  'Cheque',
]
