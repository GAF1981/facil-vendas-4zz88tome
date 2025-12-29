import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { PendenciaFormDialog } from '@/components/pendencias/PendenciaFormDialog'
import { ResolvePendenciaDialog } from '@/components/pendencias/ResolvePendenciaDialog'
import { Pendencia } from '@/types/pendencia'
import { pendenciasService } from '@/services/pendenciasService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function PendenciasPage() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [openResolve, setOpenResolve] = useState(false)
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(
    null,
  )
  const [viewResolution, setViewResolution] = useState<Pendencia | null>(null)

  // Filters
  const [filterExiste, setFilterExiste] = useState('SIM')
  const [filterResolvida, setFilterResolvida] = useState('NÃO')

  const { toast } = useToast()

  const fetchPendencias = async () => {
    // Logic for "Existe Pendências?": If NÃO, show nothing (or empty list)
    if (filterExiste === 'NÃO') {
      setPendencias([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Map "Pendência Resolvida" filter
      let resolvedFilter: boolean | undefined = undefined
      if (filterResolvida === 'SIM') resolvedFilter = true
      if (filterResolvida === 'NÃO') resolvedFilter = false

      const data = await pendenciasService.getAll(resolvedFilter)
      setPendencias(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível listar as pendências.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendencias()
  }, [filterExiste, filterResolvida])

  const filteredPendencias = pendencias.filter((p) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      p.CLIENTES?.['NOME CLIENTE']?.toLowerCase().includes(searchLower) ||
      p.CLIENTES?.CODIGO?.toString().includes(searchLower) ||
      p.FUNCIONARIOS?.nome_completo?.toLowerCase().includes(searchLower) ||
      p.descricao_pendencia.toLowerCase().includes(searchLower)
    )
  })

  const handleResolveClick = (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia)
    setOpenResolve(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pendências</h1>
            <p className="text-muted-foreground">
              Gerenciamento de itens pendentes e resoluções.
            </p>
          </div>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Incluir Pendência
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>
            Utilize os filtros para localizar pendências específicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/4 space-y-2">
              <label className="text-sm font-medium">Existe Pendências?</label>
              <Select value={filterExiste} onValueChange={setFilterExiste}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIM">SIM</SelectItem>
                  <SelectItem value="NÃO">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-1/4 space-y-2">
              <label className="text-sm font-medium">Pendência Resolvida</label>
              <Select
                value={filterResolvida}
                onValueChange={setFilterResolvida}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">TODOS</SelectItem>
                  <SelectItem value="SIM">SIM</SelectItem>
                  <SelectItem value="NÃO">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:flex-1 space-y-2">
              <label className="text-sm font-medium">Busca Rápida</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do cliente, código, funcionário ou descrição..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px]">CÓDIGO</TableHead>
                    <TableHead>NOME CLIENTE</TableHead>
                    <TableHead className="hidden md:table-cell">
                      STATUS
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Funcionário
                    </TableHead>
                    <TableHead className="min-w-[200px]">PENDENCIA</TableHead>
                    <TableHead className="text-center w-[150px]">
                      PENDENCIA RESOLVIDA?
                    </TableHead>
                    <TableHead className="text-right w-[150px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendencias.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {filterExiste === 'NÃO'
                          ? 'Filtro "Existe Pendências" está definido como NÃO.'
                          : 'Nenhuma pendência encontrada.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPendencias.map((pendencia) => (
                      <TableRow
                        key={pendencia.id}
                        className={cn(
                          'hover:bg-muted/50 transition-colors',
                          pendencia.resolvida ? 'bg-green-50/30' : '',
                        )}
                      >
                        <TableCell className="font-mono">
                          {pendencia.CLIENTES?.CODIGO}
                        </TableCell>
                        <TableCell className="font-medium">
                          {pendencia.CLIENTES?.['NOME CLIENTE']}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {pendencia.CLIENTES?.['TIPO DE CLIENTE'] || 'N/D'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {pendencia.FUNCIONARIOS?.nome_completo || '-'}
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[300px] truncate"
                            title={pendencia.descricao_pendencia}
                          >
                            {pendencia.descricao_pendencia}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={pendencia.resolvida}
                              onCheckedChange={() => {
                                if (pendencia.resolvida) {
                                  setViewResolution(pendencia)
                                }
                              }}
                              className={cn(
                                'cursor-default',
                                pendencia.resolvida &&
                                  'cursor-pointer data-[state=checked]:bg-green-600 border-green-600',
                              )}
                              title={
                                pendencia.resolvida
                                  ? 'Clique para ver a resolução'
                                  : 'Pendente'
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!pendencia.resolvida && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                              onClick={() => handleResolveClick(pendencia)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Resolver
                            </Button>
                          )}
                          {pendencia.resolvida && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-muted-foreground"
                              onClick={() => setViewResolution(pendencia)}
                            >
                              Ver Detalhes
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PendenciaFormDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={fetchPendencias}
      />

      <ResolvePendenciaDialog
        open={openResolve}
        onOpenChange={setOpenResolve}
        onSuccess={fetchPendencias}
        pendencia={selectedPendencia}
      />

      {/* View Resolution Details Dialog */}
      <Dialog
        open={!!viewResolution}
        onOpenChange={(o) => !o && setViewResolution(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Pendência Resolvida
            </DialogTitle>
            <DialogDescription>
              Detalhes da resolução para o cliente{' '}
              <strong>{viewResolution?.CLIENTES?.['NOME CLIENTE']}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded border">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                Problema Original
              </p>
              <p className="text-sm">{viewResolution?.descricao_pendencia}</p>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-100 text-green-900">
              <p className="text-xs font-bold uppercase mb-1 text-green-700">
                Resolução
              </p>
              <p className="text-sm">
                {viewResolution?.descricao_resolucao || 'Sem descrição.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
