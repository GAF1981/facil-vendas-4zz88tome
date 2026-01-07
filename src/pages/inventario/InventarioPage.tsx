import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  RefreshCw,
  Play,
  StopCircle,
  RotateCcw,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Truck,
  CheckSquare,
} from 'lucide-react'
import { InventoryGeneralTable } from '@/components/inventario/InventoryGeneralTable'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
} from '@/types/inventory_general'
import { useToast } from '@/hooks/use-toast'
import { InventoryInfoCard } from '@/components/inventario/InventoryInfoCard'
import { InventoryActionDialog } from '@/components/inventario/InventoryActionDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { safeFormatDate } from '@/lib/formatters'

export default function InventarioPage() {
  const [sessions, setSessions] = useState<InventoryGeneralSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [items, setItems] = useState<InventoryGeneralItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<any>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [saldoFinalFilter, setSaldoFinalFilter] = useState('all')

  // Persisted selections state (lifted from dialog)
  const [persistedEmployeeId, setPersistedEmployeeId] = useState<string>('')
  const [persistedSupplierId, setPersistedSupplierId] = useState<string>('')

  const { toast } = useToast()

  // Computed
  const selectedSession = useMemo(
    () => sessions.find((s) => s.id.toString() === selectedSessionId) || null,
    [sessions, selectedSessionId],
  )

  const activeSession = useMemo(
    () => sessions.find((s) => s.status === 'ABERTO'),
    [sessions],
  )

  const canEdit = selectedSession?.status === 'ABERTO'

  const loadSessions = useCallback(async () => {
    try {
      const data = await inventoryGeneralService.getSessions()
      setSessions(data)
      return data
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sessões.',
        variant: 'destructive',
      })
      return []
    }
  }, [toast])

  const loadItems = useCallback(
    async (id: number) => {
      setLoading(true)
      try {
        const inventoryData = await inventoryGeneralService.getInventoryData(id)
        setItems(inventoryData)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados do inventário.',
          variant: 'destructive',
        })
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  // Initial Load
  useEffect(() => {
    loadSessions().then((data) => {
      if (data.length > 0) {
        setSelectedSessionId(data[0].id.toString())
      }
    })
  }, [loadSessions])

  // Load items when session changes
  useEffect(() => {
    if (selectedSessionId) {
      loadItems(Number(selectedSessionId))
    } else {
      setItems([])
    }
  }, [selectedSessionId, loadItems])

  const filteredItems = useMemo(() => {
    if (saldoFinalFilter === 'all') return items
    if (saldoFinalFilter === 'zero')
      return items.filter((i) => i.saldo_final === 0)
    if (saldoFinalFilter === 'positive')
      return items.filter((i) => i.saldo_final > 0)
    return items
  }, [items, saldoFinalFilter])

  const handleStartSession = async () => {
    if (
      !confirm(
        'Isso fechará o inventário atual (se houver) e iniciará um novo baseado no saldo final anterior. Deseja continuar?',
      )
    )
      return
    try {
      await inventoryGeneralService.startNewSession()
      toast({ title: 'Sucesso', description: 'Novo inventário iniciado.' })
      const data = await loadSessions()
      if (data.length > 0) {
        setSelectedSessionId(data[0].id.toString())
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar inventário.',
        variant: 'destructive',
      })
    }
  }

  const handleResetInitial = async () => {
    if (!canEdit || !selectedSession) return
    if (
      !confirm(
        'Isso zerará o saldo inicial de todos os produtos no inventário atual. Deseja continuar?',
      )
    )
      return
    try {
      await inventoryGeneralService.resetInitialBalances(selectedSession.id)
      toast({ title: 'Sucesso', description: 'Saldos iniciais zerados.' })
      loadItems(selectedSession.id)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao resetar saldos.',
        variant: 'destructive',
      })
    }
  }

  const handleOpenAction = (type: string) => {
    if (!canEdit) return
    setActionType(type)
    setIsActionDialogOpen(true)
  }

  const handleFinalize = async () => {
    if (!canEdit || !selectedSession) return
    if (!confirm('Deseja finalizar os ajustes e abrir um novo inventário?'))
      return

    try {
      await inventoryGeneralService.finalizeAdjustments(
        selectedSession.id,
        items,
      )
      toast({
        title: 'Sucesso',
        description: 'Inventário finalizado e novo ciclo iniciado.',
      })
      const data = await loadSessions()
      if (data.length > 0) {
        setSelectedSessionId(data[0].id.toString())
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao finalizar.',
        variant: 'destructive',
      })
    }
  }

  const handleRefresh = () => {
    if (selectedSessionId) {
      loadItems(Number(selectedSessionId))
    }
    loadSessions()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-100 text-violet-700 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Inventário Geral
              </h1>
              <p className="text-muted-foreground">Controle total de estoque</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="flex items-end gap-4 bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex-1 max-w-md space-y-2">
            <Label>ID Inventário</Label>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um inventário" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id.toString()}>
                    #{session.id} - {safeFormatDate(session.data_inicio)} (
                    {session.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <InventoryInfoCard session={selectedSession} />

        {/* Actions Toolbar */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2 items-center">
            {/* If no active session exists globally, user can start one. */}
            {!activeSession && (
              <Button
                onClick={handleStartSession}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" /> Iniciar Inventário Geral
              </Button>
            )}

            {/* If user is viewing the active session, show actions */}
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={handleResetInitial}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Saldo Inicial
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenAction('COMPRA')}
                >
                  <PackagePlus className="mr-2 h-4 w-4" /> Compras
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenAction('CARRO_PARA_ESTOQUE')}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Devoluções (Carro
                  &rarr; Est)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenAction('PERDA')}
                >
                  <PackageMinus className="mr-2 h-4 w-4" /> Perdas
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenAction('ESTOQUE_PARA_CARRO')}
                >
                  <Truck className="mr-2 h-4 w-4" /> Reposições (Est &rarr;
                  Carro)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenAction('CONTAGEM')}
                >
                  <CheckSquare className="mr-2 h-4 w-4" /> Contagem
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={handleFinalize}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <StopCircle className="mr-2 h-4 w-4" /> Finalizar e Novo Ciclo
                </Button>
              </>
            )}

            {/* If viewing historical (closed) session */}
            {selectedSession && !canEdit && (
              <div className="text-sm text-muted-foreground font-medium italic flex-1 text-center">
                Visualizando histórico de inventário fechado (Somente Leitura)
              </div>
            )}
          </CardContent>
        </Card>

        {selectedSession && (
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filtrar Saldo Final:</span>
              <Select
                value={saldoFinalFilter}
                onValueChange={setSaldoFinalFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="zero">Igual a 0</SelectItem>
                  <SelectItem value="positive">Maior que 0</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedSession && <InventoryGeneralTable items={filteredItems} />}
      </div>

      <InventoryActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        type={actionType}
        sessionId={selectedSession ? selectedSession.id : 0}
        onSuccess={() =>
          selectedSessionId && loadItems(Number(selectedSessionId))
        }
        persistedEmployeeId={persistedEmployeeId}
        setPersistedEmployeeId={setPersistedEmployeeId}
        persistedSupplierId={persistedSupplierId}
        setPersistedSupplierId={setPersistedSupplierId}
      />
    </div>
  )
}
