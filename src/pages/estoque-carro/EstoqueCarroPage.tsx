import { useEffect, useState } from 'react'
import { EstoqueCarroHeader } from '@/components/estoque-carro/EstoqueCarroHeader'
import { EstoqueCarroControlBar } from '@/components/estoque-carro/EstoqueCarroControlBar'
import { EstoqueCarroTable } from '@/components/estoque-carro/EstoqueCarroTable'
import { EstoqueCarroCountDialog } from '@/components/estoque-carro/EstoqueCarroCountDialog'
import { EstoqueCarroAcertoTab } from '@/components/estoque-carro/EstoqueCarroAcertoTab'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { useUserStore } from '@/stores/useUserStore'
import { useToast } from '@/hooks/use-toast'
import { EstoqueCarroItem, EstoqueCarroSession } from '@/types/estoque_carro'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function EstoqueCarroPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<EstoqueCarroSession | null>(null)
  const [items, setItems] = useState<EstoqueCarroItem[]>([])
  const [isCountDialogOpen, setIsCountDialogOpen] = useState(false)
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false)

  // Initialization
  useEffect(() => {
    if (employee) {
      checkActiveSession()
    }
  }, [employee])

  const checkActiveSession = async () => {
    if (!employee) return
    setLoading(true)
    try {
      const active = await estoqueCarroService.getActiveSession(employee.id)
      setSession(active)
      if (active) {
        await loadSessionData(active)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sessão de estoque.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (activeSession: EstoqueCarroSession) => {
    try {
      const data = await estoqueCarroService.getSessionData(activeSession)
      setItems(data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleStartSession = async () => {
    if (!employee) return
    setLoading(true)
    try {
      const newSession = await estoqueCarroService.startSession(employee.id)
      setSession(newSession)
      await loadSessionData(newSession)
      toast({ title: 'Sessão iniciada com sucesso' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar sessão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!session) return
    if (!confirm('Tem certeza? Isso zerará o saldo inicial de todos os itens.'))
      return

    setLoading(true)
    try {
      await estoqueCarroService.resetInitialBalance(session.id)
      await loadSessionData(session)
      toast({ title: 'Saldo inicial resetado' })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate pending items state
  const hasPendingItems = items.some(
    (item) => item.saldo_final !== 0 && !item.has_count_record,
  )

  const handleFinalize = async () => {
    if (!session) return

    if (hasPendingItems) {
      toast({
        title: 'Ação Bloqueada',
        description:
          'Existem itens com saldo final pendente de contagem. Realize a contagem antes de finalizar.',
        variant: 'destructive',
      })
      return
    }

    setIsFinalizeDialogOpen(true)
  }

  const confirmFinalize = async () => {
    if (!session) return
    setLoading(true)
    try {
      await estoqueCarroService.finishSession(session, items)
      toast({ title: 'Sessão finalizada. Novo estoque iniciado.' })
      setIsFinalizeDialogOpen(false)
      await checkActiveSession()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao finalizar sessão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <EstoqueCarroHeader />

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent">
          <TabsTrigger
            value="produtos"
            className="rounded-t-md data-[state=active]:bg-background data-[state=active]:border-b-0 border border-transparent px-4 py-2"
          >
            Produtos Carro
          </TabsTrigger>
          <TabsTrigger
            value="acerto"
            className="rounded-t-md data-[state=active]:bg-background data-[state=active]:border-b-0 border border-transparent px-4 py-2"
          >
            Acerto Carro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4 pt-4">
          <EstoqueCarroControlBar
            hasActiveSession={!!session}
            onStart={handleStartSession}
            onReset={handleReset}
            onCount={() => setIsCountDialogOpen(true)}
            onFinalize={handleFinalize}
            loading={loading}
            disableFinalize={hasPendingItems} // Pass calculated state
          />

          {session && (
            <>
              <EstoqueCarroTable
                items={items}
                onRefresh={() => loadSessionData(session)}
              />
              <EstoqueCarroCountDialog
                open={isCountDialogOpen}
                onOpenChange={(open) => {
                  setIsCountDialogOpen(open)
                  if (!open && session) loadSessionData(session)
                }}
                sessionId={session.id}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="acerto" className="pt-4">
          {session && (
            <EstoqueCarroAcertoTab
              sessionId={session.id}
              employeeId={session.funcionario_id}
              onUpdate={() => loadSessionData(session)}
            />
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={isFinalizeDialogOpen}
        onOpenChange={setIsFinalizeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Estoque Carro</AlertDialogTitle>
            <AlertDialogDescription>
              Isso fechará a sessão atual, salvará os saldos finais e iniciará
              automaticamente um novo período com esses saldos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalize}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
