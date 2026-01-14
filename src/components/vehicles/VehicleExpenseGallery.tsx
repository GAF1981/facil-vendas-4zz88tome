import { useState, useEffect } from 'react'
import { vehicleService } from '@/services/vehicleService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, Search, Filter } from 'lucide-react'
import { Vehicle } from '@/types/vehicle'

export function VehicleExpenseGallery() {
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('todos')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  useEffect(() => {
    vehicleService.getAll().then(setVehicles)
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [search, vehicleFilter, dateStart, dateEnd])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await vehicleService.getExpenses({
        startDate: dateStart || undefined,
        endDate: dateEnd || undefined,
        vehicleId: vehicleFilter,
        search: search || undefined,
      })
      setExpenses(data || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl">
          Galeria de Despesas de Veículos
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por histórico ou prestador..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos Veículos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Veículos</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id.toString()}>
                  {v.placa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-[150px]"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
          <Input
            type="date"
            className="w-[150px]"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={loadExpenses}
            title="Atualizar"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Detalhes / Histórico</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead className="text-right">Hodômetro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center h-24 text-muted-foreground"
                    >
                      Nenhuma despesa encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-muted/30">
                      <TableCell>
                        {safeFormatDate(expense.Data, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.VEICULOS?.placa || '-'}
                      </TableCell>
                      <TableCell>{expense['Grupo de Despesas']}</TableCell>
                      <TableCell>{expense.Detalhamento}</TableCell>
                      <TableCell>{expense.prestador_servico || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {expense.hodometro || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {formatCurrency(expense.Valor)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.FUNCIONARIOS?.nome_completo || '-'}
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
  )
}
