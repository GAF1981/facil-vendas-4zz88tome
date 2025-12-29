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
    <Card className="mb-6 border-l-4 border-l-primary">
      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Controle de Rota
          </h2>
          {displayRota ? (
            <p className="text-muted-foreground mt-1">
              ID{' '}
              <span className="font-mono font-bold text-primary">
                {displayRota.id}
              </span>
              : Rota{' '}
              {format(
                parseISO(displayRota.data_inicio),
                "dd/MM/yyyy 'às' HH:mm",
                { locale: ptBR },
              )}
              {displayRota.data_fim ? (
                <>
                  {' '}
                  a{' '}
                  {format(
                    parseISO(displayRota.data_fim),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )}
                </>
              ) : (
                <span className="text-green-600 font-medium ml-1">
                  (Em andamento)
                </span>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">
              Nenhuma rota ativa ou recente.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {!activeRota ? (
            <Button
              onClick={onStart}
              disabled={loading}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar Rota
            </Button>
          ) : (
            <Button
              onClick={onEnd}
              disabled={loading}
              size="lg"
              variant="destructive"
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
