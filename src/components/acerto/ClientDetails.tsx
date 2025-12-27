import { ClientRow } from '@/types/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

interface ClientDetailsProps {
  client: ClientRow
  lastAcertoDate?: string | null
}

export function ClientDetails({ client, lastAcertoDate }: ClientDetailsProps) {
  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        </div>

        {lastAcertoDate && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Último Acerto:</span>
            <span>{format(new Date(lastAcertoDate), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
