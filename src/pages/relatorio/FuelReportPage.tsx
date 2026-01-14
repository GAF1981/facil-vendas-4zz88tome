import { useEffect, useState, useMemo } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Fuel, Loader2, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { caixaService, FuelReportRow } from '@/services/caixaService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'

export default function FuelReportPage() {
  const [data, setData] = useState<FuelReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('todos')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [report, empResult] = await Promise.all([
          caixaService.getFuelReportData(),
          employeesService.getEmployees(1, 100),
        ])
        setData(report)
        setEmployees(empResult.data.filter((e) => e.situacao === 'ATIVO'))
      } catch (error) {
        console.error('Failed to load fuel report', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredData = useMemo(() => {
    if (selectedEmployeeId === 'todos') return data
    return data.filter(
      (row) => row.employeeId?.toString() === selectedEmployeeId,
    )
  }, [data, selectedEmployeeId])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/relatorio">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Fuel className="h-8 w-8 text-orange-600" />
              Relatório de Combustível
            </h1>
            <p className="text-muted-foreground">
              Análise de consumo e eficiência por quilômetro.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Funcionários</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Abastecimentos (Gasolina)</CardTitle>
          <CardDescription>
            Cálculo de eficiência (Km/R$) baseado na distância percorrida e
            valor do abastecimento anterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead className="text-right">
                    Hodômetro Inicial
                  </TableHead>
                  <TableHead className="text-right">Hodômetro Final</TableHead>
                  <TableHead className="text-right">Km Percorrido</TableHead>
                  <TableHead
                    className="text-right font-bold"
                    title="Km por Real"
                  >
                    Km / R$
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground h-24"
                    >
                      Nenhum registro de gasolina encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => {
                    const dist =
                      row.initialOdometer !== null
                        ? row.finalOdometer - row.initialOdometer
                        : null

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          {safeFormatDate(row.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{row.employeeName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.gasolineValue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {row.initialOdometer !== null
                            ? row.initialOdometer
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {row.finalOdometer}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {dist !== null ? `${dist} km` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-600">
                          {row.costPerKm !== null
                            ? `${row.costPerKm.toFixed(2)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
