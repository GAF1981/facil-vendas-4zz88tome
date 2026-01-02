import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Plus,
} from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'
import { inventarioService } from '@/services/inventarioService'
import { InventarioItem, InventorySession } from '@/types/inventario'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { EmployeeSelectionDialog } from '@/components/inventario/EmployeeSelectionDialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function InventarioPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventarioItem[]>([])
  const { toast } = useToast()

  const [activeSession, setActiveSession] = useState<InventorySession | null>(
    null,
  )
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async (funcionarioId?: number) => {
    setLoading(true)
    try {
      // If we have an active session, use its ID. If passed specifically, use that.
      // If active session is GERAL, no ID.
      const targetId =
        funcionarioId ?? activeSession?.funcionario_id ?? undefined
      const result = await inventarioService.getInventory(targetId)
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os dados de inventário.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSession = async () => {
    try {
      const session = await inventarioService.getActiveSession()
      setActiveSession(session)
      // If there is an active session, fetch data based on it
      if (session) {
        fetchData(session.funcionario_id ?? undefined)
      } else {
        // Default general load
        fetchData()
      }
    } catch (error) {
      console.error(error)
      fetchData()
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  const handleStartGeneralInventory = async () => {
    setActionLoading(true)
    try {
      const session = await inventarioService.startSession('GERAL')
      setActiveSession(session)
      fetchData()
      toast({
        title: 'Inventário Geral Iniciado',
        description: 'Você iniciou uma sessão de inventário geral.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao iniciar',
        description: 'Não foi possível iniciar o inventário.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartEmployeeInventory = (employeeId: number) => {
    const start = async () => {
      setActionLoading(true)
      try {
        const session = await inventarioService.startSession(
          'FUNCIONARIO',
          employeeId,
        )
        setActiveSession(session)
        setIsEmployeeDialogOpen(false)
        fetchData(employeeId)
        toast({
          title: 'Inventário de Funcionário Iniciado',
          description:
            'Você iniciou uma sessão de inventário para funcionário.',
        })
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao iniciar',
          description: 'Não foi possível iniciar o inventário.',
          variant: 'destructive',
        })
      } finally {
        setActionLoading(false)
      }
    }
    start()
  }

  const handleCloseInventory = async () => {
    if (!activeSession) return
    setActionLoading(true)
    try {
      await inventarioService.closeSession(activeSession.id)
      setActiveSession(null)
      fetchData(undefined) // Reset to general view
      toast({
        title: 'Inventário Finalizado',
        description: 'A sessão de inventário foi encerrada com sucesso.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao finalizar',
        description: 'Não foi possível encerrar o inventário.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getHeaderTitle = () => {
    if (activeSession?.tipo === 'GERAL') return 'Inventário Estoque Geral'
    if (activeSession?.tipo === 'FUNCIONARIO') return 'Inventário Funcionário'
    return 'Inventário de Mercadorias'
  }

  const renderActionButtons = () => {
    if (activeSession) {
      return (
        <>
          <Button variant="secondary" className="gap-2">
            <Plus className="h-4 w-4" />
            Inserir Mercadorias
          </Button>
          <Button
            variant="destructive"
            onClick={handleCloseInventory}
            disabled={actionLoading}
          >
            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {activeSession.tipo === 'GERAL'
              ? 'Fechar Inventário Geral'
              : 'Fechar Inventário de Funcionário'}
          </Button>
        </>
      )
    }

    return (
      <>
        <Button
          onClick={handleStartGeneralInventory}
          disabled={actionLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar Inventário Estoque Geral
        </Button>
        <Button
          onClick={() => setIsEmployeeDialogOpen(true)}
          disabled={actionLoading}
          variant="outline"
        >
          Iniciar Inventário Funcionário
        </Button>
      </>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 text-violet-700 rounded-lg shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
            <p className="text-muted-foreground">
              Visão geral do estoque, movimentações e conferência.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              fetchData(activeSession?.funcionario_id ?? undefined)
            }
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        {renderActionButtons()}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{getHeaderTitle()}</CardTitle>
              <CardDescription>
                Acompanhamento detalhado de entradas, saídas e saldo final.
              </CardDescription>
            </div>
            {activeSession?.tipo === 'FUNCIONARIO' && (
              <div className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                Data de Início de Inventário:{' '}
                {format(new Date(activeSession.data_inicio), 'dd/MM/yyyy', {
                  locale: ptBR,
                })}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <InventarioTable data={data} />
          )}
        </CardContent>
      </Card>

      <EmployeeSelectionDialog
        open={isEmployeeDialogOpen}
        onOpenChange={setIsEmployeeDialogOpen}
        onConfirm={handleStartEmployeeInventory}
        loading={actionLoading}
      />
    </div>
  )
}
