import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PendenciaFormData, pendenciaSchema } from '@/types/pendencia'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { employeesService } from '@/services/employeesService'
import { pendenciasService } from '@/services/pendenciasService'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUserStore } from '@/stores/useUserStore'

interface PendenciaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PendenciaFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: PendenciaFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const { toast } = useToast()
  const { employee: currentUser } = useUserStore()

  const form = useForm<PendenciaFormData>({
    resolver: zodResolver(pendenciaSchema),
    defaultValues: {
      cliente_id: 0,
      funcionario_id: currentUser?.id || 0,
      descricao_pendencia: '',
    },
  })

  useEffect(() => {
    if (open) {
      // Load employees
      employeesService.getEmployees(1, 100).then(({ data }) => {
        setEmployees(data)
      })
      // Reset form
      form.reset({
        cliente_id: 0,
        funcionario_id: currentUser?.id || 0,
        descricao_pendencia: '',
      })
      setSelectedClient(null)
    }
  }, [open, currentUser, form])

  const handleClientSelect = (client: ClientRow) => {
    setSelectedClient(client)
    form.setValue('cliente_id', client.CODIGO)
  }

  const onSubmit = async (data: PendenciaFormData) => {
    setLoading(true)
    try {
      await pendenciasService.create({
        cliente_id: data.cliente_id,
        funcionario_id: data.funcionario_id,
        descricao_pendencia: data.descricao_pendencia,
        resolvida: false,
        descricao_resolucao: null,
      })

      toast({
        title: 'Pendência criada',
        description: 'A pendência foi registrada com sucesso.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a pendência.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Incluir Pendência</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Cliente</FormLabel>
              {selectedClient ? (
                <div className="flex items-center justify-between border p-2 rounded-md bg-muted/20">
                  <div className="text-sm">
                    <span className="font-bold">{selectedClient.CODIGO}</span> -{' '}
                    {selectedClient['NOME CLIENTE']}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setSelectedClient(null)
                      form.setValue('cliente_id', 0)
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <ClientSearch onSelect={handleClientSelect} />
              )}
              {form.formState.errors.cliente_id && (
                <p className="text-xs font-medium text-destructive">
                  Selecione um cliente.
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="funcionario_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? field.value.toString() : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao_pendencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Pendência</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o problema ou pendência..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || form.watch('cliente_id') === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Pendência
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
