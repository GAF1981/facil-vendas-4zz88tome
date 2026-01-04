import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt } from 'lucide-react'

interface AcertoFiscalSectionProps {
  clientNotaFiscal: string | null
  notaFiscalVenda: string
  onNotaFiscalVendaChange: (value: string) => void
  disabled?: boolean
}

export function AcertoFiscalSection({
  clientNotaFiscal,
  notaFiscalVenda,
  onNotaFiscalVendaChange,
  disabled = false,
}: AcertoFiscalSectionProps) {
  return (
    <Card className="border-muted bg-muted/10 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Emissão de Nota Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col space-y-1 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <span className="text-sm text-muted-foreground font-medium">
              Nota Fiscal Cadastro
            </span>
            <span className="text-xl font-bold">
              {clientNotaFiscal || 'NÃO'}
            </span>
          </div>

          <div className="flex flex-col space-y-2 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <Label htmlFor="notaFiscalVenda" className="font-medium">
              Nota Fiscal Venda <span className="text-red-500">*</span>
            </Label>
            <Select
              value={notaFiscalVenda}
              onValueChange={onNotaFiscalVendaChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="notaFiscalVenda"
                className={notaFiscalVenda === '' ? 'border-red-300' : ''}
              >
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIM">SIM</SelectItem>
                <SelectItem value="NÃO">NÃO</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Obrigatório para finalizar o acerto.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
