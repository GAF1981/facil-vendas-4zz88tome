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
import { Button } from '@/components/ui/button'
import { ArrowLeft, Fuel, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { caixaService, FuelReportRow } from '@/services/caixaService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'

export default function FuelReportPage() {
  const [data, setData] = useState<FuelReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const report = await caixaService.getFuelReportData()
        setData(report)
      } catch (error) {
        console.error('Failed to load fuel report', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
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
            Análise de consumo e custo por quilômetro.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Abastecimentos (Gasolina)</CardTitle>
          <CardDescription>
            Cálculo de custo baseado na diferença de hodômetro entre
            abastecimentos consecutivos do mesmo funcionário.
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
                  <TableHead className="text-right font-bold">
                    R$ / Km
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground h-24"
                    >
                      Nenhum registro de gasolina encontrado.
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
                            ? `R$ ${row.costPerKm.toFixed(2)}`
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
