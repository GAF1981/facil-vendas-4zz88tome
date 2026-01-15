import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Gift, Search, Eraser } from 'lucide-react'
import { Link } from 'react-router-dom'
import { brindeService } from '@/services/brindeService'
import { Brinde } from '@/types/brinde'
import { safeFormatDate } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'

export default function BrindeReportPage() {
  const [data, setData] = useState<Brinde[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const { toast } = useToast()

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    clientName: '',
    productName: '',
    employeeId: 'todos',
  })

  useEffect(() => {
    employeesService.getEmployees(1, 100).then((res) => {
      setEmployees(res.data)
    })
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await brindeService.getAll(filters)
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar relatório de brindes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      clientName: '',
      productName: '',
      employeeId: 'todos',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/relatorio">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-8 w-8 text-purple-600" />
            Relatório de Brindes
          </h1>
          <p className="text-muted-foreground">
            Histórico de brindes entregues aos clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine a busca por brindes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange('startDate', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Nome do cliente..."
                value={filters.clientName}
                onChange={(e) =>
                  handleFilterChange('clientName', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Input
                placeholder="Nome do produto..."
                value={filters.productName}
                onChange={(e) =>
                  handleFilterChange('productName', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select
                value={filters.employeeId}
                onValueChange={(v) => handleFilterChange('employeeId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="secondary" onClick={clearFilters}>
              <Eraser className="mr-2 h-4 w-4" /> Limpar
            </Button>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Funcionário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum brinde encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      <TableCell>
                        {safeFormatDate(row.data, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {row.cliente_nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Cód: {row.cliente_codigo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{row.produto_nome}</span>
                          <span className="text-xs text-muted-foreground">
                            Cód: {row.produto_codigo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-600">
                        {row.quantidade}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.funcionario_nome}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
