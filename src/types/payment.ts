export type PaymentMethodType = 'Pix' | 'Dinheiro' | 'Boleto' | 'Cheque'

export interface PaymentInstallment {
  number: number
  value: number
  paidValue: number
  dueDate: string
}

export interface PixDetails {
  nome: string
  banco: string
  chave?: string
}

export interface PaymentEntry {
  method: PaymentMethodType
  value: number // Valor Registrado
  paidValue: number // Valor Pago
  installments: number
  dueDate: string
  details?: PaymentInstallment[]
  hasZeroDownPayment?: boolean
  pixDetails?: PixDetails // Metadata for Pix
}

export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Pix',
  'Dinheiro',
  'Boleto',
  'Cheque',
]
