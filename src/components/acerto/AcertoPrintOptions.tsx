import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Printer } from 'lucide-react'

interface AcertoPrintOptionsProps {
  format: 'A4' | '80mm'
  onFormatChange: (value: 'A4' | '80mm') => void
  disabled?: boolean
}

export function AcertoPrintOptions({
  format,
  onFormatChange,
  disabled = false,
}: AcertoPrintOptionsProps) {
  return (
    <Card className="border-muted bg-muted/10 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          Formato de Impressão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={format}
          onValueChange={(v) => onFormatChange(v as 'A4' | '80mm')}
          disabled={disabled}
          className="flex flex-col space-y-3 pt-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="A4" id="fmt-a4" />
            <Label htmlFor="fmt-a4" className="cursor-pointer font-normal">
              Padrão (A4)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="80mm" id="fmt-80mm" />
            <Label htmlFor="fmt-80mm" className="cursor-pointer font-normal">
              Térmica (80mm)
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground mt-3">
          Selecione conforme a impressora disponível.
        </p>
      </CardContent>
    </Card>
  )
}
