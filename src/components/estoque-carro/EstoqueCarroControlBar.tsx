import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  RotateCcw,
  Play,
  Calculator,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

interface Props {
  hasActiveSession: boolean
  onStart: () => void
  onReset: () => void
  onCount: () => void
  onFinalize: () => void
  onUpdateStock?: () => void
  loading: boolean
}

export function EstoqueCarroControlBar({
  hasActiveSession,
  onStart,
  onReset,
  onCount,
  onFinalize,
  onUpdateStock,
  loading,
}: Props) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap gap-2">
        {!hasActiveSession ? (
          <Button
            onClick={onStart}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="mr-2 h-4 w-4" /> Iniciar Carro Estoque
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onReset} disabled={loading}>
              <RotateCcw className="mr-2 h-4 w-4 text-red-600" /> Reset Saldo
              Inicial
            </Button>

            {onUpdateStock && (
              <Button
                variant="outline"
                className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                onClick={onUpdateStock}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Atualizar estoque Carro
              </Button>
            )}

            <Button variant="secondary" onClick={onCount} disabled={loading}>
              <Calculator className="mr-2 h-4 w-4" /> Contagem Carro
            </Button>

            <div className="flex-1" />

            <Button
              onClick={onFinalize}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar Ajustes e
              Abrir Novo
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
