import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ResolucaoFormData,
  resolucaoSchema,
  Pendencia,
} from '@/types/pendencia'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Loader2, CheckCircle2 } from 'lucide-react'
import { pendenciasService } from '@/services/pendenciasService'
import { useToast } from '@/hooks/use-toast'

interface ResolvePendenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  pendencia: Pendencia | null
}

export function ResolvePendenciaDialog({
  open,
  onOpenChange,
  onSuccess,
  pendencia,
}: ResolvePendenciaDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<ResolucaoFormData>({
    resolver: zodResolver(resolucaoSchema),
    defaultValues: {
      descricao_resolucao: '',
    },
  })

  const onSubmit = async (data: ResolucaoFormData) => {
    if (!pendencia) return
    setLoading(true)
    try {
      await pendenciasService.resolve(pendencia.id, data.descricao_resolucao)
      toast({
        title: 'Pendência Resolvida!',
        description: 'A resolução foi registrada com sucesso.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })
      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a resolução.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!pendencia) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Resolver Pendência
          </DialogTitle>
          <DialogDescription>
            Confirme a resolução para o cliente{' '}
            <strong>{pendencia.CLIENTES?.['NOME CLIENTE']}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-md text-sm mb-4">
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">
            Problema Original:
          </p>
          <p>{pendencia.descricao_pendencia}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descricao_resolucao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Resolução</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva como o problema foi resolvido..."
                      className="resize-none h-24"
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
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Resolução
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
