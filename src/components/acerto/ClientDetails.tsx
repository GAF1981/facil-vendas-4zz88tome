import { ClientRow } from '@/types/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Calendar } from 'lucide-react'

interface ClientDetailsProps {
  client: ClientRow
  lastAcerto?: { date: string; time: string } | null
}

export function ClientDetails({ client, lastAcerto }: ClientDetailsProps) {
  let formattedDate: string | null = null
  let formattedTime: string | null = null
  const hasAcerto = !!lastAcerto && (!!lastAcerto.date || !!lastAcerto.time)

  if (hasAcerto && lastAcerto?.date) {
    try {
      // Attempt to parse ISO string (YYYY-MM-DD) which is the standard format
      // If fails (e.g. DD/MM/YYYY string in legacy data), fallback to raw
      const dateObj = parseISO(lastAcerto.date)
      if (!isNaN(dateObj.getTime())) {
        formattedDate = format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
      } else {
        formattedDate = lastAcerto.date
      }
    } catch (e) {
      formattedDate = lastAcerto.date
    }
  }

  if (hasAcerto && lastAcerto?.time) {
    // Format time to HH:mm, removing seconds if present
    const timeParts = lastAcerto.time.split(':')
    if (timeParts.length >= 2) {
      formattedTime = `${timeParts[0]}:${timeParts[1]}`
    } else {
      formattedTime = lastAcerto.time
    }
  }

  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Código</Label>
            <p className="font-medium font-mono text-lg text-primary">
              {client.CODIGO}
            </p>
          </div>
          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <p
              className="font-medium truncate text-lg"
              title={client['NOME CLIENTE'] || ''}
            >
              {client['NOME CLIENTE']}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Endereço</Label>
            <p className="font-medium truncate" title={client.ENDEREÇO || ''}>
              {client.ENDEREÇO || '-'}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Localização</Label>
            <div className="flex flex-col">
              <span className="font-medium truncate">
                {client.MUNICÍPIO || '-'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {client.BAIRRO || '-'}
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Último Acerto
            </Label>
            {hasAcerto ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 font-medium truncate text-base text-blue-600">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate || 'Data N/D'}</span>
                </div>
                {formattedTime && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formattedTime}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pt-1">
                Nenhum acerto encontrado
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
