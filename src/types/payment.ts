export type PaymentMethodType = 'Boleto' | 'Pix' | 'Dinheiro' | 'Cheque'

export interface PaymentInstallment {
  number: number
  value: number
  dueDate: string
}

export interface PaymentEntry {
  method: PaymentMethodType
  value: number // Maps to "Valor Registrado"
  paidValue: number // Maps to "Valor Pago"
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
