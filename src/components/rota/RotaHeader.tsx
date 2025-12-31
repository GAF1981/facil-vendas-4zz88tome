import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Rota } from '@/types/rota'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Play, Square, Loader2 } from 'lucide-react'

interface RotaHeaderProps {
  activeRota: Rota | null
  lastRota: Rota | null
  onStart: () => void
  onEnd: () => void
  loading: boolean
}

export function RotaHeader({
  activeRota,
  lastRota,
  onStart,
  onEnd,
  loading,
}: RotaHeaderProps) {
  const displayRota = activeRota || lastRota

  return (
    <Card className="w-full border-l-4 border-l-primary shadow-sm bg-muted/20">
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 overflow-hidden">
          <h2 className="text-lg font-bold tracking-tight whitespace-nowrap">
            Controle de Rota
          </h2>
          {displayRota ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 truncate">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                #{displayRota.id}
              </span>
              <span className="truncate">
                {format(parseISO(displayRota.data_inicio), 'dd/MM HH:mm', {
                  locale: ptBR,
                })}
                {displayRota.data_fim ? (
                  <>
                    {' -> '}
                    {format(parseISO(displayRota.data_fim), 'dd/MM HH:mm', {
                      locale: ptBR,
                    })}
                  </>
                ) : (
                  <span className="text-green-600 font-semibold ml-1">
                    (Em andamento)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma rota ativa ou recente.
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          {!activeRota ? (
            <Button
              onClick={onStart}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar Nova Rota
            </Button>
          ) : (
            <Button
              onClick={onEnd}
              disabled={loading}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Finalizar Rota
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
