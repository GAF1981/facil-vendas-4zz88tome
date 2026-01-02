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
  Calendar,
  Hash,
  PlayCircle,
  StopCircle,
  ScanBarcode,
  Truck,
  RotateCcw,
} from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'
import { inventarioService } from '@/services/inventarioService'
import { InventarioItem, DatasDeInventario } from '@/types/inventario'
import { useToast } from '@/hooks/use-toast'
import { Link, useNavigate } from 'react-router-dom'
import { EmployeeSelectionDialog } from '@/components/inventario/EmployeeSelectionDialog'
import { MovementDialog } from '@/components/inventario/MovementDialog'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function InventarioPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventarioItem[]>([])
  const { toast } = useToast()
  const navigate = useNavigate()

  const [activeSession, setActiveSession] = useState<DatasDeInventario | null>(
    null,
  )
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Movement Dialogs State
  const [isReposicaoOpen, setIsReposicaoOpen] = useState(false)
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false)

  const fetchData = async (
    funcionarioId?: number,
    sessionId?: number | null,
  ) => {
    setLoading(true)
    try {
      const targetId =
        funcionarioId ?? activeSession?.['CODIGO FUNCIONARIO'] ?? undefined
      const targetSessionId = sessionId ?? activeSession?.['ID INVENTÁRIO']

      const result = await inventarioService.getInventory(
        targetId,
        targetSessionId,
      )
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
      // If we have an active session, pass its ID to ensure continuity logic works
      fetchData(
        session?.['CODIGO FUNCIONARIO'] ?? undefined,
        session?.['ID INVENTÁRIO'],
      )
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
      fetchData(undefined, session['ID INVENTÁRIO'])
      toast({
        title: 'Inventário Geral Iniciado',
        description: `Sessão #${session['ID INVENTÁRIO']} iniciada.`,
        className: 'bg-blue-600 text-white',
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
        fetchData(employeeId, session['ID INVENTÁRIO'])
        toast({
          title: 'Inventário de Funcionário Iniciado',
          description: `Sessão #${session['ID INVENTÁRIO']} iniciada para funcionário ${employeeId}.`,
          className: 'bg-blue-600 text-white',
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
      await inventarioService.closeSession(activeSession['ID INVENTÁRIO'])
      setActiveSession(null)
      // Fetch without session ID to show latest state (which is now previous session)
      // or show empty state? usually show latest available.
      fetchData(undefined, null)
      toast({
        title: 'Inventário Finalizado',
        description: 'A sessão de inventário foi encerrada com sucesso.',
        className: 'bg-green-600 text-white',
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

  const handleMovement = async (
    type: 'REPOSICAO' | 'DEVOLUCAO',
    employeeId: number,
    productId: number,
    quantity: number,
  ) => {
    if (!activeSession) return
    try {
      await inventarioService.createMovement({
        TIPO: type,
        funcionario_id: employeeId,
        produto_id: productId,
        quantidade: quantity,
        session_id: activeSession['ID INVENTÁRIO'],
      })
      toast({
        title:
          type === 'REPOSICAO'
            ? 'Reposição Registrada'
            : 'Devolução Registrada',
        description: 'A movimentação foi salva com sucesso.',
        className: 'bg-green-600 text-white',
      })
      fetchData(
        activeSession['CODIGO FUNCIONARIO'] ?? undefined,
        activeSession['ID INVENTÁRIO'],
      )
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na movimentação',
        description: 'Não foi possível salvar a movimentação.',
        variant: 'destructive',
      })
    }
  }

  const getHeaderTitle = () => {
    if (activeSession?.TIPO === 'GERAL') return 'Inventário Estoque Geral'
    if (activeSession?.TIPO === 'FUNCIONARIO') return 'Inventário Funcionário'
    return 'Inventário de Mercadorias'
  }

  const renderActionButtons = () => {
    if (activeSession) {
      return (
        <>
          <Button
            variant="outline"
            className="gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
            onClick={() => setIsReposicaoOpen(true)}
          >
            <Truck className="h-4 w-4" />
            Reposição
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
            onClick={() => setIsDevolucaoOpen(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Devolução
          </Button>
          <div className="w-px h-8 bg-gray-200 mx-2 hidden md:block" />
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Link to="/inventario/contagem">
              <ScanBarcode className="h-4 w-4" />
              Contagem de Saldo Final
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleCloseInventory}
            disabled={actionLoading}
            className="gap-2"
          >
            {actionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <StopCircle className="h-4 w-4" />
            )}
            {activeSession.TIPO === 'GERAL'
              ? 'Fechar Inventário Geral'
              : 'Fechar Inventário'}
          </Button>
        </>
      )
    }

    return (
      <>
        <Button
          onClick={handleStartGeneralInventory}
          disabled={actionLoading}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          {actionLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Iniciar Inventário Estoque Geral
        </Button>
        <Button
          onClick={() => setIsEmployeeDialogOpen(true)}
          disabled={actionLoading}
          variant="outline"
          className="gap-2"
        >
          <PlayCircle className="h-4 w-4" />
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
            {activeSession && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-violet-700 bg-violet-50 px-3 py-1.5 rounded-md border border-violet-100">
                <div className="flex items-center gap-1 font-mono">
                  <Hash className="h-3.5 w-3.5" />
                  ID: {activeSession['ID INVENTÁRIO']}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Início:{' '}
                  {format(
                    parseISO(activeSession['Data de Início de Inventário']),
                    'dd/MM/yyyy HH:mm',
                    { locale: ptBR },
                  )}
                </div>
              </div>
            )}
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
              fetchData(
                activeSession?.['CODIGO FUNCIONARIO'] ?? undefined,
                activeSession?.['ID INVENTÁRIO'],
              )
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

      <div className="flex flex-wrap gap-3 justify-end items-center">
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

      <MovementDialog
        open={isReposicaoOpen}
        onOpenChange={setIsReposicaoOpen}
        type="REPOSICAO"
        onConfirm={(empId, prodId, qty) =>
          handleMovement('REPOSICAO', empId, prodId, qty)
        }
      />

      <MovementDialog
        open={isDevolucaoOpen}
        onOpenChange={setIsDevolucaoOpen}
        type="DEVOLUCAO"
        onConfirm={(empId, prodId, qty) =>
          handleMovement('DEVOLUCAO', empId, prodId, qty)
        }
      />
    </div>
  )
}
