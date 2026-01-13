import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Rota } from '@/types/rota'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Play,
  Square,
  Loader2,
  Download,
  Save,
  AlertTriangle,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface RotaHeaderProps {
  activeRota: Rota | null
  lastRota: Rota | null
  onStart: () => void
  onEnd: () => void
  onExport: () => void
  loading: boolean
  hasPendingUpdates?: boolean
  pendingClosures?: string[]
}

export function RotaHeader({
  activeRota,
  lastRota,
  onStart,
  onEnd,
  onExport,
  loading,
  hasPendingUpdates = false,
  pendingClosures = [],
}: RotaHeaderProps) {
  const displayRota = activeRota || lastRota
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()

  // Logic for visibility of "Finalizar Rota"
  const canFinalize = (() => {
    if (canAccess('Relatório')) return true

    if (employee?.setor) {
      const sectors = Array.isArray(employee.setor)
        ? employee.setor
        : [employee.setor]
      if (sectors.includes('Administrador') || sectors.includes('Gerente')) {
        return true
      }
    }
    return false
  })()

  const hasPendingClosures = pendingClosures.length > 0

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

        <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto items-center">
          {hasPendingUpdates && (
            <div className="flex items-center gap-2 text-xs text-orange-600 font-medium animate-pulse mr-2">
              <Save className="h-3 w-3" />
              Salvando...
            </div>
          )}

          <Button
            onClick={onExport}
            variant="outline"
            className="w-full sm:w-auto"
            title="Exportar para Excel (CSV)"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

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
            canFinalize && (
              <>
                {hasPendingClosures && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-2 h-9 border border-orange-200"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {pendingClosures.length} Pendência(s) de Fechamento
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 bg-orange-50 border-orange-200"
                      align="end"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Fechamentos Pendentes
                        </h4>
                        <p className="text-xs text-orange-800">
                          Os seguintes vendedores precisam fechar o caixa antes
                          de finalizar a rota:
                        </p>
                        <ul className="list-disc pl-4 text-sm text-orange-900">
                          {pendingClosures.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                <div className="relative group">
                  <Button
                    onClick={onEnd}
                    disabled={
                      loading || hasPendingUpdates || hasPendingClosures
                    }
                    variant="destructive"
                    className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="mr-2 h-4 w-4" />
                    )}
                    Finalizar Rota
                  </Button>
                  {hasPendingClosures && (
                    <div className="absolute top-full right-0 mt-1 w-64 p-2 bg-black/80 text-white text-xs rounded hidden group-hover:block z-50 text-center">
                      Não é possível finalizar. Existem caixas abertos.
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
