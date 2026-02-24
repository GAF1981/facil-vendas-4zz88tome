import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { metasService } from '@/services/metasService'
import { employeesService } from '@/services/employeesService'
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, CalendarDays, Calendar as CalendarIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Employee } from '@/types/employee'
import { cn } from '@/lib/utils'

export function ManageExceptionsDialog({
  onExceptionsChanged,
}: {
  onExceptionsChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [exceptions, setExceptions] = useState<any[]>([])
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<'global' | 'specific'>('global')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())

  const { toast } = useToast()

  const loadExceptions = async () => {
    const data = await metasService.getExceptionDays()
    setExceptions(data)
  }

  const loadEmployees = async () => {
    const { data } = await employeesService.getEmployees(1, 1000)
    setEmployees(data)
  }

  useEffect(() => {
    if (open) {
      loadExceptions()
      loadEmployees()
    }
  }, [open])

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    if (date) {
      setEndDate(date)
    }
  }

  const handleAdd = async () => {
    if (!startDate || !endDate || !description) {
      toast({
        title: 'Atenção',
        description: 'Preencha datas e descrição',
        variant: 'destructive',
      })
      return
    }

    if (scope === 'specific' && !selectedEmployeeId) {
      toast({
        title: 'Atenção',
        description: 'Selecione um funcionário',
        variant: 'destructive',
      })
      return
    }

    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')
    const empId = scope === 'specific' ? parseInt(selectedEmployeeId, 10) : null

    try {
      await metasService.addExceptionDay(startStr, endStr, description, empId)
      toast({ title: 'Adicionado' })
      setDescription('')
      setStartDate(new Date())
      setEndDate(new Date())
      loadExceptions()
      onExceptionsChanged()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    await metasService.deleteExceptionDay(id)
    toast({ title: 'Removido' })
    loadExceptions()
    onExceptionsChanged()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarDays className="w-4 h-4 mr-2" />
          Gerenciar Feriados/Exceções
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Feriados e Exceções</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Férias, Feriado"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Escopo</Label>
              <RadioGroup
                value={scope}
                onValueChange={(val) => setScope(val as any)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="r1" />
                  <Label htmlFor="r1">Todos os Funcionários</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="r2" />
                  <Label htmlFor="r2">Funcionário Específico</Label>
                </div>
              </RadioGroup>
            </div>

            {scope === 'specific' && (
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
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
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        <span>Selecione...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        <span>Selecione...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button onClick={handleAdd} className="w-full">
              Adicionar Exceção
            </Button>
          </div>

          <div className="border rounded-md p-4 h-[400px] overflow-auto">
            <h4 className="font-semibold mb-4">Exceções Cadastradas</h4>
            <div className="space-y-2">
              {exceptions.map((exc) => (
                <div
                  key={exc.id}
                  className="flex items-center justify-between bg-muted/50 p-3 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {format(parseISO(exc.data_inicio), 'dd/MM/yyyy')}
                      {exc.data_inicio !== exc.data_fim &&
                        ` até ${format(parseISO(exc.data_fim), 'dd/MM/yyyy')}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {exc.descricao}
                    </div>
                    <div className="text-xs text-indigo-500 font-medium mt-1">
                      {exc.FUNCIONARIOS
                        ? `Apenas: ${exc.FUNCIONARIOS.nome_completo}`
                        : 'Todos os Funcionários'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(exc.id)}
                    className="text-red-500 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
