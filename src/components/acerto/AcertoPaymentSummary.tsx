import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import { Wallet, CreditCard } from 'lucide-react'

interface AcertoPaymentSummaryProps {
  saldoAPagar: number
  paymentMethod: string
  onPaymentMethodChange: (value: string) => void
}

export function AcertoPaymentSummary({
  saldoAPagar,
  paymentMethod,
  onPaymentMethodChange,
}: AcertoPaymentSummaryProps) {
  return (
    <Card className="border-muted bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Resumos de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Saldo a Pagar */}
          <div className="flex flex-col space-y-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
            <span className="text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
              <DollarSignIcon className="h-3.5 w-3.5" /> Saldo a Pagar
            </span>
            <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              R$ {formatCurrency(saldoAPagar)}
            </span>
          </div>

          {/* Forma de Pagamento */}
          <div className="flex flex-col space-y-2 justify-center">
            <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Forma de Pagamento
            </Label>
            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione a forma de pagamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Boleto Parcelado">
                  Boleto Parcelado
                </SelectItem>
                <SelectItem value="Pix/dinheiro/Cheque">
                  Pix / Dinheiro / Cheque
                </SelectItem>
                <SelectItem value="Pix/dinheiro/Cheque (Parcelado)">
                  Pix / Dinheiro / Cheque (Parcelado)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
