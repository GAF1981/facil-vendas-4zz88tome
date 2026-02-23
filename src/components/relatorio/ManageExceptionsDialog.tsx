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
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, CalendarDays } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ManageExceptionsDialog({
  onExceptionsChanged,
}: {
  onExceptionsChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [exceptions, setExceptions] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [description, setDescription] = useState('')
  const { toast } = useToast()

  const loadExceptions = async () => {
    const data = await metasService.getExceptionDays()
    setExceptions(data)
  }

  useEffect(() => {
    if (open) loadExceptions()
  }, [open])

  const handleAdd = async () => {
    if (!selectedDate || !description) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    await metasService.addExceptionDay(dateStr, description)
    toast({ title: 'Adicionado' })
    setDescription('')
    loadExceptions()
    onExceptionsChanged()
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Feriados e Exceções</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="border rounded-md mx-auto"
            />
            <Input
              placeholder="Descrição (ex: Carnaval)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                  className="flex items-center justify-between bg-muted/50 p-2 rounded"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {format(parseISO(exc.data), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {exc.descricao}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(exc.id)}
                    className="text-red-500"
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
