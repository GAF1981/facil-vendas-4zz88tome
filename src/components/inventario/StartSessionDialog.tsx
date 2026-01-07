import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'
import { Loader2, PlayCircle } from 'lucide-react'

interface StartSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (employeeId: number | null) => Promise<void>
}

export function StartSessionDialog({
  open,
  onOpenChange,
  onConfirm,
}: StartSessionDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('0') // '0' for General/No specific employee
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        setLoadingEmployees(true)
        try {
          const { data } = await employeesService.getEmployees(1, 100)
          setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
        } catch (error) {
          console.error('Failed to fetch employees', error)
        } finally {
          setLoadingEmployees(false)
        }
      }
      fetchEmployees()
      setSelectedEmployeeId('0')
    }
  }, [open])

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      const empId =
        selectedEmployeeId === '0' ? null : parseInt(selectedEmployeeId)
      await onConfirm(empId)
      onOpenChange(false)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Iniciar Novo Inventário</DialogTitle>
          <DialogDescription>
            Defina o responsável para iniciar uma nova sessão de contagem.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Responsável</Label>
            {loadingEmployees ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando
                funcionários...
              </div>
            ) : (
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    -- Inventário Geral (Sem Responsável Específico) --
                  </SelectItem>
                  {employees.map((employee) => (
                    <SelectItem
                      key={employee.id}
                      value={employee.id.toString()}
                    >
                      {employee.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={actionLoading}>
            {actionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Iniciar Sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
