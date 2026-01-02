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
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'
import { Loader2 } from 'lucide-react'

interface EmployeeSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (employeeId: number) => void
  loading?: boolean
}

export function EmployeeSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: EmployeeSelectionDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

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
    } else {
      setSelectedEmployeeId('')
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedEmployeeId) {
      onConfirm(parseInt(selectedEmployeeId))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Selecionar Funcionário</DialogTitle>
          <DialogDescription>
            Escolha o funcionário para iniciar o inventário.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loadingEmployees ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedEmployeeId || loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
