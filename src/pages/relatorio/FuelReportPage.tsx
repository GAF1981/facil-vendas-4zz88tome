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
import { Input } from '@/components/ui/input'
import { ArrowLeft, Fuel, Loader2, Filter, Car, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { caixaService, FuelReportRow } from '@/services/caixaService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { employeesService } from '@/services/employeesService'
import { vehicleService } from '@/services/vehicleService'
import { Employee } from '@/types/employee'
import { Vehicle } from '@/types/vehicle'
import { Label } from '@/components/ui/label'

export default function FuelReportPage() {
  const [data, setData] = useState<FuelReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('todos')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('todos')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [report, empResult, vehResult] = await Promise.all([
        caixaService.getFuelReportData({
          employeeId: selectedEmployeeId,
          vehicleId: selectedVehicleId,
          startDate,
          endDate,
        }),
        employeesService.getEmployees(1, 100),
        vehicleService.getAll(),
      ])
      // Limit to 10 most recent as per acceptance criteria
      setData(report.slice(0, 10))
      setEmployees(empResult.data.filter((e) => e.situacao === 'ATIVO'))
      setVehicles(vehResult)
    } catch (error) {
      console.error('Failed to load fuel report', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchData()
  }, []) // Load once on mount

  // Manual Trigger for filters
  const handleApplyFilters = () => {
    fetchData()
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
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
              Análise de consumo e eficiência (Km/R$) por veículo.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full sm:w-[200px] space-y-1">
              <Label className="text-xs">Vendedor</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[200px] space-y-1">
              <Label className="text-xs">Veículo</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={setSelectedVehicleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[150px] space-y-1">
              <Label className="text-xs">Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-[150px] space-y-1">
              <Label className="text-xs">Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Button onClick={handleApplyFilters}>
              <Filter className="mr-2 h-4 w-4" /> Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente (Últimos 10)</CardTitle>
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
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">
                      Hodômetro Inicial
                    </TableHead>
                    <TableHead className="text-right">
                      Hodômetro Final
                    </TableHead>
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
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground h-24"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => {
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
                          <TableCell>
                            {row.vehiclePlate ? (
                              <div className="flex items-center gap-1 font-mono text-xs border rounded px-1.5 py-0.5 bg-muted w-fit">
                                <Car className="w-3 h-3" />
                                {row.vehiclePlate}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="capitalize">
                            {row.fuelType || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-700">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
