export type PaymentMethodType = 'Pix' | 'Dinheiro' | 'Boleto' | 'Cheque'

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

// Reordered to prioritize PIX
export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Pix',
  'Dinheiro',
  'Boleto',
  'Cheque',
]
