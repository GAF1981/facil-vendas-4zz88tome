import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ClipboardList,
  Search,
  RefreshCw,
  AlertCircle,
  Play,
  StopCircle,
  Hash,
  Calendar,
  User,
  History,
} from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'
import { InventarioTableSkeleton } from '@/components/inventario/InventarioTableSkeleton'
import { InventarioPagination } from '@/components/inventario/InventarioPagination'
import { StartSessionDialog } from '@/components/inventario/StartSessionDialog'
import { inventarioService } from '@/services/inventarioService'
import { InventoryProduct, InventorySession } from '@/types/inventario'
import { useToast } from '@/hooks/use-toast'
import { safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function InventarioPage() {
  // Data State
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Session State
  const [activeSession, setActiveSession] = useState<InventorySession | null>(
    null,
  )
  const [sessionLoading, setSessionLoading] = useState(true)

  // Filter & Pagination State
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Dialog State
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)

  const { toast } = useToast()
  const totalPages = Math.ceil(totalCount / pageSize)

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1) // Reset to first page on new search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch Session
  const fetchSession = useCallback(async () => {
    setSessionLoading(true)
    try {
      const session = await inventarioService.getActiveSession()
      setActiveSession(session)
    } catch (err) {
      console.error('Failed to fetch session:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o status da sessão.',
        variant: 'destructive',
      })
    } finally {
      setSessionLoading(false)
    }
  }, [toast])

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, totalCount } = await inventarioService.getProducts(
        page,
        pageSize,
        debouncedSearch,
      )
      setProducts(data)
      setTotalCount(totalCount)
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setError('Falha ao carregar a lista de produtos.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch])

  // Initial Load
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Handlers
  const handleStartSession = async (employeeId: number | null) => {
    try {
      const session = await inventarioService.startSession(employeeId)
      setActiveSession(session)
      toast({
        title: 'Inventário Iniciado',
        description: `Sessão #${session.id} criada com sucesso.`,
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o inventário.',
        variant: 'destructive',
      })
    }
  }

  const handleFinishSession = async () => {
    if (!activeSession) return
    if (
      !confirm(
        'Tem certeza que deseja finalizar esta sessão de inventário? Esta ação não pode ser desfeita.',
      )
    )
      return

    try {
      await inventarioService.finishSession(activeSession.id)
      setActiveSession(null)
      toast({
        title: 'Inventário Finalizado',
        description: 'A sessão foi encerrada com sucesso.',
        className: 'bg-blue-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar o inventário.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-100 text-violet-700 rounded-lg shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
              <p className="text-muted-foreground">
                Gerencie contagens e visualize o estoque disponível.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {activeSession ? (
              <Button
                variant="destructive"
                className="w-full sm:w-auto gap-2"
                onClick={handleFinishSession}
              >
                <StopCircle className="h-4 w-4" />
                Finalizar Inventário
              </Button>
            ) : (
              <Button
                className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => setIsStartDialogOpen(true)}
                disabled={sessionLoading}
              >
                <Play className="h-4 w-4" />
                Iniciar Novo Inventário
              </Button>
            )}
          </div>
        </div>

        {/* Active Session Banner */}
        {activeSession && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-md border border-green-100 shadow-sm animate-fade-in-down">
            <div className="flex items-center gap-2 font-semibold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Sessão em Andamento
            </div>
            <div className="hidden sm:block w-px h-4 bg-green-200" />
            <div className="flex items-center gap-1.5 font-mono">
              <Hash className="h-3.5 w-3.5" />#{activeSession.id}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Início: {safeFormatDate(activeSession.data_inicio)}
            </div>
            {activeSession.funcionario_id && (
              <>
                <div className="hidden sm:block w-px h-4 bg-green-200" />
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Resp: Func#{activeSession.funcionario_id}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Produtos do Estoque</CardTitle>
              <CardDescription>
                Lista completa de produtos cadastrados no sistema.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nome, código ou grupo..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchProducts}
                disabled={loading}
                title="Atualizar Lista"
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <InventarioTableSkeleton />
          ) : (
            <>
              <InventarioTable data={products} />
              <InventarioPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <StartSessionDialog
        open={isStartDialogOpen}
        onOpenChange={setIsStartDialogOpen}
        onConfirm={handleStartSession}
      />
    </div>
  )
}
