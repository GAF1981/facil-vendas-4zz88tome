import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend,
  startOfDay,
  isAfter,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { employeesService } from '@/services/employeesService'
import { metasService } from '@/services/metasService'
import { Employee } from '@/types/employee'
import {
  Target,
  TrendingUp,
  CheckCircle,
  Search,
  Plus,
  Loader2,
  PieChart,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { ManageExceptionsDialog } from '@/components/relatorio/ManageExceptionsDialog'

const MetasReportPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [summaryFilter, setSummaryFilter] = useState<string>('rota')

  const [isLoading, setIsLoading] = useState(false)
  const [dailyAcertos, setDailyAcertos] = useState<Map<string, number>>(
    new Map(),
  )
  const [currentMetaDiaria, setCurrentMetaDiaria] = useState<number>(0)
  const [exceptionDates, setExceptionDates] = useState<any[]>([])

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogEmployeeId, setDialogEmployeeId] = useState<string>('')
  const [dialogMetaValue, setDialogMetaValue] = useState<string>('')
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  const { toast } = useToast()

  const fetchExceptions = useCallback(async () => {
    try {
      const data = await metasService.getExceptionDays()
      setExceptionDates(data)
    } catch (e) {
      console.error('Failed to load exceptions', e)
    }
  }, [])

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await employeesService.getEmployees(1, 1000)
        setEmployees(data)
      } catch (error) {
        console.error('Error fetching employees:', error)
      }
    }
    fetchEmployees()
    fetchExceptions()
  }, [fetchExceptions])

  const handleSearch = async () => {
    if (!selectedEmployeeId || !dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Filtro Incompleto',
        description: 'Selecione um funcionário e um período válido.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const funcId = parseInt(selectedEmployeeId, 10)
      const startStr = format(dateRange.from, 'yyyy-MM-dd')
      const endStr = format(dateRange.to, 'yyyy-MM-dd')

      const metaInfo = await metasService.getMeta(funcId)
      setCurrentMetaDiaria(metaInfo?.meta_diaria || 0)

      const acertos = await metasService.getAcertos(funcId, startStr, endStr)
      setDailyAcertos(acertos)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao buscar dados',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveMeta = async () => {
    if (!dialogEmployeeId || !dialogMetaValue) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingMeta(true)
    try {
      const funcId = parseInt(dialogEmployeeId, 10)
      const meta = parseFloat(dialogMetaValue)
      await metasService.upsertMeta(funcId, meta)
      toast({
        title: 'Sucesso',
        description: 'Meta atualizada com sucesso!',
        className: 'bg-green-600 text-white',
      })
      setIsDialogOpen(false)
      setDialogEmployeeId('')
      setDialogMetaValue('')

      if (selectedEmployeeId === dialogEmployeeId) {
        handleSearch()
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  const checkIsException = useCallback(
    (date: Date, empId: string) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      for (const exc of exceptionDates) {
        if (dateStr >= exc.data_inicio && dateStr <= exc.data_fim) {
          if (!exc.funcionario_id || exc.funcionario_id.toString() === empId) {
            return true
          }
        }
      }
      return false
    },
    [exceptionDates],
  )

  const reportData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const isException = checkIsException(day, selectedEmployeeId)
      const isWknd = isWeekend(day)
      const isNonWorkingDay = isException || isWknd

      const metaForDay = isNonWorkingDay
        ? 0
        : parseFloat(currentMetaDiaria.toFixed(2))
      const acertos = dailyAcertos.get(dateStr) || 0
      const apuracao = acertos - metaForDay

      return {
        date: day,
        dateStr,
        acertos,
        metaForDay,
        apuracao,
        isException,
        isWeekend: isWknd,
      }
    })
  }, [
    dateRange,
    dailyAcertos,
    currentMetaDiaria,
    checkIsException,
    selectedEmployeeId,
  ])

  const summary = useMemo(() => {
    let totalAcertos = 0
    let totalMetas = 0
    let totalApuracao = 0

    const today = startOfDay(new Date())

    reportData.forEach((row) => {
      // Only aggregate data up to today for summary accuracy
      if (!isAfter(row.date, today)) {
        totalAcertos += row.acertos
        totalMetas += row.metaForDay
        totalApuracao += row.apuracao
      }
    })

    const atingimento = totalMetas > 0 ? (totalAcertos / totalMetas) * 100 : 0

    return {
      totalAcertos,
      totalMetas: parseFloat(totalMetas.toFixed(2)),
      totalApuracao: parseFloat(totalApuracao.toFixed(2)),
      atingimento: parseFloat(atingimento.toFixed(2)),
    }
  }, [reportData])

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Metas de Acertos
          </h1>
          <p className="text-muted-foreground">
            Acompanhamento diário de metas por funcionário.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ManageExceptionsDialog
            onExceptionsChanged={() => {
              fetchExceptions().then(() => {
                if (selectedEmployeeId) handleSearch()
              })
            }}
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Meta Diária</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select
                    value={dialogEmployeeId}
                    onValueChange={setDialogEmployeeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meta Diária (Quantidade de Acertos)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dialogMetaValue}
                    onChange={(e) => setDialogMetaValue(e.target.value)}
                    placeholder="Ex: 15"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveMeta} disabled={isSavingMeta}>
                  {isSavingMeta ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Salvar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione o período e o funcionário para gerar o relatório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full md:w-auto flex-1">
              <Label>Filtro de Resumo</Label>
              <Select value={summaryFilter} onValueChange={setSummaryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rota">Por Rota</SelectItem>
                  <SelectItem value="funcionario">Por Funcionário</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full md:w-auto flex-1">
              <Label>Período</Label>
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full"
              />
            </div>
            <div className="space-y-2 w-full md:w-auto flex-1">
              <Label>Funcionário</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Target className="w-4 h-4 mr-2 text-indigo-500" />
                  Total Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalMetas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Total Acertos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalAcertos}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                  Apuração de Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${summary.totalApuracao < 0 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {summary.totalApuracao > 0 ? '+' : ''}
                  {summary.totalApuracao}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <PieChart className="w-4 h-4 mr-2 text-purple-500" />
                  Atingimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.atingimento}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento Diário</CardTitle>
              <CardDescription>
                Exibe as metas e acertos planejados e alcançados em cada dia do
                período selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Acertos</TableHead>
                    <TableHead className="text-right">
                      Meta de Acertos
                    </TableHead>
                    <TableHead className="text-right">
                      Apuração de Meta
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        row.isException || row.isWeekend ? 'bg-muted/50' : ''
                      }
                    >
                      <TableCell>
                        {format(row.date, 'dd/MM/yyyy', { locale: ptBR })}
                        {row.isException && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Exceção/Feriado)
                          </span>
                        )}
                        {row.isWeekend && !row.isException && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Fim de Semana)
                          </span>
                        )}
                        {isAfter(row.date, startOfDay(new Date())) && (
                          <span className="ml-2 text-xs text-blue-500 font-medium">
                            (Futuro)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.acertos}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.metaForDay}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${row.apuracao < 0 ? 'text-red-600' : row.apuracao > 0 ? 'text-green-600' : ''}`}
                      >
                        {row.apuracao > 0 ? '+' : ''}
                        {parseFloat(row.apuracao.toFixed(2))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reportData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Nenhum dado encontrado para o período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default MetasReportPage
